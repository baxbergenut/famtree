package http

import (
	"errors"
	"net/http"
	"time"

	"famtree/backend/internal/auth"
	"famtree/backend/internal/config"
	"famtree/backend/internal/tree"
)

func healthHandler(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{
			"status": "ok",
			"env":    cfg.AppEnv,
		})
	}
}

func versionHandler(cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"service": "famtree-api",
			"env":     cfg.AppEnv,
			"time":    time.Now().UTC().Format(time.RFC3339),
		})
	}
}

func registerHandler(cfg config.Config, authService *auth.Service) http.HandlerFunc {
	type request struct {
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
		Email     string `json:"email"`
		Password  string `json:"password"`
	}

	return func(w http.ResponseWriter, r *http.Request) {
		var payload request
		if err := readJSON(r, &payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		user, sessionToken, err := authService.Register(r.Context(), auth.RegisterInput{
			FirstName: payload.FirstName,
			LastName:  payload.LastName,
			Email:     payload.Email,
			Password:  payload.Password,
		})
		if err != nil {
			switch {
			case errors.Is(err, auth.ErrEmailTaken):
				writeError(w, http.StatusConflict, err.Error())
			case errors.Is(err, auth.ErrInvalidRegistration):
				writeError(w, http.StatusBadRequest, "first name, last name, email, and a password of at least 8 characters are required")
			default:
				writeError(w, http.StatusInternalServerError, "failed to register user")
			}
			return
		}

		setSessionCookie(w, cfg, sessionToken)
		writeJSON(w, http.StatusCreated, map[string]any{
			"user": user,
		})
	}
}

func loginHandler(cfg config.Config, authService *auth.Service) http.HandlerFunc {
	type request struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	return func(w http.ResponseWriter, r *http.Request) {
		var payload request
		if err := readJSON(r, &payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		user, sessionToken, err := authService.Login(r.Context(), auth.LoginInput{
			Email:    payload.Email,
			Password: payload.Password,
		})
		if err != nil {
			switch {
			case errors.Is(err, auth.ErrInvalidCredentials):
				writeError(w, http.StatusUnauthorized, err.Error())
			default:
				writeError(w, http.StatusInternalServerError, "failed to log in")
			}
			return
		}

		setSessionCookie(w, cfg, sessionToken)
		writeJSON(w, http.StatusOK, map[string]any{
			"user": user,
		})
	}
}

func logoutHandler(cfg config.Config, authService *auth.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_ = authService.Logout(r.Context(), readSessionToken(r, cfg))
		clearSessionCookie(w, cfg)
		w.WriteHeader(http.StatusNoContent)
	}
}

func meHandler(cfg config.Config, authService *auth.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, err := authService.CurrentUser(r.Context(), readSessionToken(r, cfg))
		if err != nil {
			if errors.Is(err, auth.ErrUnauthorized) {
				writeError(w, http.StatusUnauthorized, "not authenticated")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to load session")
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"user": user,
		})
	}
}

func treeHandler(cfg config.Config, authService *auth.Service, treeService *tree.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, err := authService.CurrentUser(r.Context(), readSessionToken(r, cfg))
		if err != nil {
			if errors.Is(err, auth.ErrUnauthorized) {
				writeError(w, http.StatusUnauthorized, "not authenticated")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to load session")
			return
		}

		treeSummary, err := treeService.GetByOwnerUserID(r.Context(), user.UserID)
		if err != nil {
			if errors.Is(err, tree.ErrTreeNotFound) {
				writeError(w, http.StatusNotFound, "tree not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to load tree")
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"tree": treeSummary,
		})
	}
}

func setSessionCookie(w http.ResponseWriter, cfg config.Config, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     cfg.SessionCookie,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   cfg.AppEnv == "production",
		MaxAge:   60 * 60 * 24 * 30,
	})
}

func clearSessionCookie(w http.ResponseWriter, cfg config.Config) {
	http.SetCookie(w, &http.Cookie{
		Name:     cfg.SessionCookie,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   cfg.AppEnv == "production",
		MaxAge:   -1,
	})
}

func readSessionToken(r *http.Request, cfg config.Config) string {
	cookie, err := r.Cookie(cfg.SessionCookie)
	if err != nil {
		return ""
	}

	return cookie.Value
}
