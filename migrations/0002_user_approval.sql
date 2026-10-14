-- Migration: 0002_user_approval.sql
-- Adiciona controle de aprovação prévia de acesso pelo administrador (IAM)

ALTER TABLE users ADD COLUMN is_approved INTEGER NOT NULL DEFAULT 0;

-- Administradores existentes têm aprovação garantida
UPDATE users SET is_approved = 1 WHERE role = 'admin';
