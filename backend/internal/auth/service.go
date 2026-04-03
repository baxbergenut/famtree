package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

const sessionLifetime = 30 * 24 * time.Hour

var (
	ErrEmailTaken          = errors.New("email is already registered")
	ErrInvalidCredentials  = errors.New("invalid email or password")
	ErrInvalidRegistration = errors.New("invalid registration data")
	ErrUnauthorized        = errors.New("not authenticated")
)

type Service struct {
	db *sql.DB
}

type RegisterInput struct {
	FirstName string
	LastName  string
	Email     string
	Password  string
}

type LoginInput struct {
	Email    string
	Password string
}

type SessionUser struct {
	UserID       string `json:"userId"`
	Email        string `json:"email"`
	TreeID       string `json:"treeId"`
	RootPersonID string `json:"rootPersonId"`
	FirstName    string `json:"firstName"`
	LastName     string `json:"lastName"`
}

func NewService(db *sql.DB) *Service {
	return &Service{db: db}
}

func (s *Service) Register(ctx context.Context, input RegisterInput) (SessionUser, string, error) {
	input = sanitizeRegisterInput(input)
	if err := validateRegisterInput(input); err != nil {
		return SessionUser{}, "", err
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return SessionUser{}, "", fmt.Errorf("hash password: %w", err)
	}

	sessionToken, sessionHash, err := newSessionToken()
	if err != nil {
		return SessionUser{}, "", err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return SessionUser{}, "", err
	}
	defer tx.Rollback()

	var userID string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO users (email, password_hash)
		VALUES ($1, $2)
		RETURNING id
	`, input.Email, string(passwordHash)).Scan(&userID)
	if err != nil {
		if isUniqueViolation(err) {
			return SessionUser{}, "", ErrEmailTaken
		}
		return SessionUser{}, "", err
	}

	var treeID string
	if err := tx.QueryRowContext(ctx, `
		INSERT INTO trees (owner_user_id)
		VALUES ($1)
		RETURNING id
	`, userID).Scan(&treeID); err != nil {
		return SessionUser{}, "", err
	}

	var rootPersonID string
	if err := tx.QueryRowContext(ctx, `
		INSERT INTO persons (
			tree_id,
			first_name,
			last_name,
			note,
			x,
			y,
			created_by_user_id
		)
		VALUES ($1, $2, $3, $4, 0, 0, $5)
		RETURNING id
	`, treeID, input.FirstName, input.LastName, "you", userID).Scan(&rootPersonID); err != nil {
		return SessionUser{}, "", err
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE trees
		SET root_person_id = $1, updated_at = NOW()
		WHERE id = $2
	`, rootPersonID, treeID); err != nil {
		return SessionUser{}, "", err
	}

	if err := s.createSession(ctx, tx, userID, sessionHash); err != nil {
		return SessionUser{}, "", err
	}

	if err := tx.Commit(); err != nil {
		return SessionUser{}, "", err
	}

	return SessionUser{
		UserID:       userID,
		Email:        input.Email,
		TreeID:       treeID,
		RootPersonID: rootPersonID,
		FirstName:    input.FirstName,
		LastName:     input.LastName,
	}, sessionToken, nil
}

func (s *Service) Login(ctx context.Context, input LoginInput) (SessionUser, string, error) {
	input.Email = normalizeEmail(input.Email)
	if input.Email == "" || strings.TrimSpace(input.Password) == "" {
		return SessionUser{}, "", ErrInvalidCredentials
	}

	var userID, email, passwordHash, treeID, rootPersonID, firstName, lastName string
	err := s.db.QueryRowContext(ctx, `
		SELECT
			u.id,
			u.email,
			u.password_hash,
			t.id,
			p.id,
			p.first_name,
			p.last_name
		FROM users u
		JOIN trees t ON t.owner_user_id = u.id
		JOIN persons p ON p.id = t.root_person_id
		WHERE u.email = $1
	`, input.Email).Scan(&userID, &email, &passwordHash, &treeID, &rootPersonID, &firstName, &lastName)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return SessionUser{}, "", ErrInvalidCredentials
		}
		return SessionUser{}, "", err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(input.Password)); err != nil {
		return SessionUser{}, "", ErrInvalidCredentials
	}

	sessionToken, sessionHash, err := newSessionToken()
	if err != nil {
		return SessionUser{}, "", err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return SessionUser{}, "", err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `
		UPDATE users
		SET last_login_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`, userID); err != nil {
		return SessionUser{}, "", err
	}

	if err := s.createSession(ctx, tx, userID, sessionHash); err != nil {
		return SessionUser{}, "", err
	}

	if err := tx.Commit(); err != nil {
		return SessionUser{}, "", err
	}

	return SessionUser{
		UserID:       userID,
		Email:        email,
		TreeID:       treeID,
		RootPersonID: rootPersonID,
		FirstName:    firstName,
		LastName:     lastName,
	}, sessionToken, nil
}

func (s *Service) CurrentUser(ctx context.Context, rawSessionToken string) (SessionUser, error) {
	if rawSessionToken == "" {
		return SessionUser{}, ErrUnauthorized
	}

	sessionHash := hashToken(rawSessionToken)

	var user SessionUser
	err := s.db.QueryRowContext(ctx, `
		SELECT
			u.id,
			u.email,
			t.id,
			p.id,
			p.first_name,
			p.last_name
		FROM sessions s
		JOIN users u ON u.id = s.user_id
		JOIN trees t ON t.owner_user_id = u.id
		JOIN persons p ON p.id = t.root_person_id
		WHERE s.token_hash = $1
		  AND s.expires_at > NOW()
	`, sessionHash).Scan(
		&user.UserID,
		&user.Email,
		&user.TreeID,
		&user.RootPersonID,
		&user.FirstName,
		&user.LastName,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return SessionUser{}, ErrUnauthorized
		}
		return SessionUser{}, err
	}

	_, _ = s.db.ExecContext(ctx, `
		UPDATE sessions
		SET last_seen_at = NOW()
		WHERE token_hash = $1
	`, sessionHash)

	return user, nil
}

func (s *Service) Logout(ctx context.Context, rawSessionToken string) error {
	if rawSessionToken == "" {
		return nil
	}

	_, err := s.db.ExecContext(ctx, `
		DELETE FROM sessions
		WHERE token_hash = $1
	`, hashToken(rawSessionToken))

	return err
}

func (s *Service) createSession(ctx context.Context, tx *sql.Tx, userID, sessionHash string) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO sessions (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`, userID, sessionHash, time.Now().UTC().Add(sessionLifetime))

	return err
}

func sanitizeRegisterInput(input RegisterInput) RegisterInput {
	input.FirstName = strings.TrimSpace(input.FirstName)
	input.LastName = strings.TrimSpace(input.LastName)
	input.Email = normalizeEmail(input.Email)
	input.Password = strings.TrimSpace(input.Password)

	return input
}

func validateRegisterInput(input RegisterInput) error {
	if input.FirstName == "" || input.Email == "" {
		return ErrInvalidRegistration
	}

	if !strings.Contains(input.Email, "@") {
		return ErrInvalidRegistration
	}

	if len(input.Password) < 8 {
		return ErrInvalidRegistration
	}

	return nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func newSessionToken() (string, string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", "", err
	}

	token := base64.RawURLEncoding.EncodeToString(raw)
	return token, hashToken(token), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
