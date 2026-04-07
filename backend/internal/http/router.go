package http

import (
	"database/sql"
	"net/http"

	"famdawg/backend/internal/auth"
	"famdawg/backend/internal/config"
	"famdawg/backend/internal/tree"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func NewRouter(cfg config.Config, db *sql.DB) http.Handler {
	router := chi.NewRouter()
	authService := auth.NewService(db)
	treeService := tree.NewService(db)

	router.Use(middleware.RequestID)
	router.Use(middleware.RealIP)
	router.Use(middleware.Logger)
	router.Use(middleware.Recoverer)
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.FrontendOrigin},
		AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodDelete, http.MethodOptions},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	router.Get("/healthz", healthHandler(cfg))

	router.Route("/v1", func(r chi.Router) {
		r.Get("/", versionHandler(cfg))
		r.Route("/auth", func(authRouter chi.Router) {
			authRouter.Post("/register", registerHandler(cfg, authService))
			authRouter.Post("/login", loginHandler(cfg, authService))
			authRouter.Post("/logout", logoutHandler(cfg, authService))
			authRouter.Get("/me", meHandler(cfg, authService))
		})
		r.Get("/tree", treeHandler(cfg, authService, treeService))
		r.Get("/tree/graph", graphHandler(cfg, authService, treeService))
		r.Post("/persons/relative", createRelativeHandler(cfg, authService, treeService))
		r.Patch("/persons/{personID}", updatePersonHandler(cfg, authService, treeService))
		r.Delete("/persons/{personID}", deletePersonHandler(cfg, authService, treeService))
		r.Patch("/persons/{personID}/position", updatePersonPositionHandler(cfg, authService, treeService))
	})

	return router
}
