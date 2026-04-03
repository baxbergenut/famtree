package tree

import (
	"database/sql"
	"errors"
)

var (
	ErrTreeNotFound       = errors.New("tree not found")
	ErrPersonNotFound     = errors.New("person not found")
	ErrInvalidRelation    = errors.New("invalid relation")
	ErrInvalidPersonInput = errors.New("invalid person input")
	ErrParentLimitReached = errors.New("child already has two parents")
)

type Service struct {
	db *sql.DB
}

type RootPerson struct {
	ID        string  `json:"id"`
	FirstName string  `json:"firstName"`
	LastName  string  `json:"lastName"`
	Note      *string `json:"note,omitempty"`
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
}

type TreeSummary struct {
	ID          string     `json:"id"`
	OwnerUserID string     `json:"ownerUserId"`
	RootPerson  RootPerson `json:"rootPerson"`
}

type Person struct {
	ID        string  `json:"id"`
	FirstName string  `json:"firstName"`
	LastName  string  `json:"lastName"`
	Note      *string `json:"note,omitempty"`
	BirthDate *string `json:"birthDate,omitempty"`
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	IsRoot    bool    `json:"isRoot"`
}

type Union struct {
	ID        string   `json:"id"`
	ParentIDs []string `json:"parentIds"`
	ChildIDs  []string `json:"childIds"`
}

type Graph struct {
	TreeID       string   `json:"treeId"`
	RootPersonID string   `json:"rootPersonId"`
	Persons      []Person `json:"persons"`
	Unions       []Union  `json:"unions"`
}

type CreateRelativeInput struct {
	AnchorPersonID string
	Relation       string
	FirstName      string
	LastName       string
	Note           *string
	BirthDate      *string
}

type UpdatePositionInput struct {
	PersonID string
	X        float64
	Y        float64
}

func NewService(db *sql.DB) *Service {
	return &Service{db: db}
}
