package http

import (
	"errors"
	"net/http"
	"time"

	"famtree/backend/internal/auth"
	"famtree/backend/internal/config"
	"famtree/backend/internal/tree"

	"github.com/go-chi/chi/v5"
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
				writeError(w, http.StatusBadRequest, "name, email, and a password of at least 8 characters are required")
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

func graphHandler(cfg config.Config, authService *auth.Service, treeService *tree.Service) http.HandlerFunc {
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

		graph, err := treeService.GetGraphByOwnerUserID(r.Context(), user.UserID)
		if err != nil {
			if errors.Is(err, tree.ErrTreeNotFound) {
				writeError(w, http.StatusNotFound, "tree not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to load tree graph")
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"graph": graph,
		})
	}
}

func createRelativeHandler(cfg config.Config, authService *auth.Service, treeService *tree.Service) http.HandlerFunc {
	type request struct {
		AnchorPersonID string  `json:"anchorPersonId"`
		Relation       string  `json:"relation"`
		FirstName      string  `json:"firstName"`
		LastName       string  `json:"lastName"`
		Note           *string `json:"note"`
		BirthDate      *string `json:"birthDate"`
	}

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

		var payload request
		if err := readJSON(r, &payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		graph, err := treeService.CreateRelative(r.Context(), user.UserID, tree.CreateRelativeInput{
			AnchorPersonID: payload.AnchorPersonID,
			Relation:       payload.Relation,
			FirstName:      payload.FirstName,
			LastName:       payload.LastName,
			Note:           payload.Note,
			BirthDate:      payload.BirthDate,
		})
		if err != nil {
			switch {
			case errors.Is(err, tree.ErrInvalidRelation):
				writeError(w, http.StatusBadRequest, "relation must be either parent or child")
			case errors.Is(err, tree.ErrInvalidPersonInput):
				writeError(w, http.StatusBadRequest, "name is required")
			case errors.Is(err, tree.ErrParentLimitReached):
				writeError(w, http.StatusBadRequest, "this person already has two parents")
			case errors.Is(err, tree.ErrPersonNotFound):
				writeError(w, http.StatusNotFound, "anchor person not found")
			default:
				writeError(w, http.StatusInternalServerError, "failed to create relative")
			}
			return
		}

		writeJSON(w, http.StatusCreated, map[string]any{
			"graph": graph,
		})
	}
}

func updatePersonPositionHandler(cfg config.Config, authService *auth.Service, treeService *tree.Service) http.HandlerFunc {
	type request struct {
		X float64 `json:"x"`
		Y float64 `json:"y"`
	}

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

		personID := chi.URLParam(r, "personID")
		if personID == "" {
			writeError(w, http.StatusBadRequest, "missing person id")
			return
		}

		var payload request
		if err := readJSON(r, &payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if err := treeService.UpdatePosition(r.Context(), user.UserID, tree.UpdatePositionInput{
			PersonID: personID,
			X:        payload.X,
			Y:        payload.Y,
		}); err != nil {
			switch {
			case errors.Is(err, tree.ErrPersonNotFound):
				writeError(w, http.StatusNotFound, "person not found")
			default:
				writeError(w, http.StatusInternalServerError, "failed to update person position")
			}
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

func updatePersonHandler(cfg config.Config, authService *auth.Service, treeService *tree.Service) http.HandlerFunc {
	type request struct {
		FirstName string  `json:"firstName"`
		LastName  string  `json:"lastName"`
		Note      *string `json:"note"`
		BirthDate *string `json:"birthDate"`
	}

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

		personID := chi.URLParam(r, "personID")
		if personID == "" {
			writeError(w, http.StatusBadRequest, "missing person id")
			return
		}

		var payload request
		if err := readJSON(r, &payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		graph, err := treeService.UpdatePerson(r.Context(), user.UserID, tree.UpdatePersonInput{
			PersonID:  personID,
			FirstName: payload.FirstName,
			LastName:  payload.LastName,
			Note:      payload.Note,
			BirthDate: payload.BirthDate,
		})
		if err != nil {
			switch {
			case errors.Is(err, tree.ErrInvalidPersonInput):
				writeError(w, http.StatusBadRequest, "name is required")
			case errors.Is(err, tree.ErrPersonNotFound):
				writeError(w, http.StatusNotFound, "person not found")
			default:
				writeError(w, http.StatusInternalServerError, "failed to update person")
			}
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"graph": graph,
		})
	}
}

func deletePersonHandler(cfg config.Config, authService *auth.Service, treeService *tree.Service) http.HandlerFunc {
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

		personID := chi.URLParam(r, "personID")
		if personID == "" {
			writeError(w, http.StatusBadRequest, "missing person id")
			return
		}

		graph, err := treeService.DeletePerson(r.Context(), user.UserID, personID)
		if err != nil {
			switch {
			case errors.Is(err, tree.ErrCannotDeleteRoot):
				writeError(w, http.StatusBadRequest, "the root person cannot be deleted")
			case errors.Is(err, tree.ErrPersonNotFound):
				writeError(w, http.StatusNotFound, "person not found")
			default:
				writeError(w, http.StatusInternalServerError, "failed to delete person")
			}
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"graph": graph,
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
