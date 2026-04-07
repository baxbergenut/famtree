param(
  [string]$DbName = "famdawg",
  [string]$DbUser = "postgres",
  [string]$DbHost = "127.0.0.1",
  [int]$DbPort = 5432
)

$databaseExists = psql -h $DbHost -p $DbPort -U $DbUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DbName';"

if ($databaseExists -ne "1") {
  psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c "CREATE DATABASE $DbName;"
}

psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -f "$PSScriptRoot\..\init.sql"
