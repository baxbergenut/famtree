package main

import (
	"log"
	"net/http"
	"time"

	"famtree/backend/internal/config"
	apihttp "famtree/backend/internal/http"
	"famtree/backend/internal/store"
)

func main() {
	cfg := config.Load()
	db, err := store.Open(cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatal(err)
	}

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           apihttp.NewRouter(cfg, db),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	log.Printf("famtree api listening on http://localhost:%s", cfg.Port)

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
