package config

import "os"

type Config struct {
	AppEnv         string
	Port           string
	FrontendOrigin string
	DatabaseURL    string
	SessionCookie  string
}

func Load() Config {
	return Config{
		AppEnv:         getEnv("APP_ENV", "development"),
		Port:           getEnv("APP_PORT", "8081"),
		FrontendOrigin: getEnv("FRONTEND_ORIGIN", "http://localhost:3000"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://postgres@127.0.0.1:5432/famtree?sslmode=disable"),
		SessionCookie:  getEnv("SESSION_COOKIE_NAME", "famtree_session"),
	}
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}
