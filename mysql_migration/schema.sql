-- ============================================================
-- Blockchain Land Registration System - MySQL Schema
-- Replaces: MongoDB LandRegistry + Revenue_Dept databases
-- ============================================================

-- === DATABASE 1: LandRegistry ===
CREATE DATABASE IF NOT EXISTS LandRegistry CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE LandRegistry;

-- Replaces: LandRegistry.Property_Docs collection
-- Also replaces: GridFS (files stored as LONGBLOB)
CREATE TABLE IF NOT EXISTS property_docs (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    owner         VARCHAR(255)  NOT NULL,
    property_id   VARCHAR(255)  NOT NULL UNIQUE,
    survey_no     VARCHAR(100)  DEFAULT '',
    area          VARCHAR(100)  DEFAULT '',
    filename      VARCHAR(512)  NOT NULL,          -- e.g. "owner_propertyId.pdf"
    file_data     LONGBLOB      NOT NULL,          -- replaces GridFS binary storage
    uploaded_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_property_id (property_id),
    INDEX idx_survey_area (survey_no, area)
);


-- === DATABASE 2: Revenue_Dept ===
CREATE DATABASE IF NOT EXISTS Revenue_Dept CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE Revenue_Dept;

-- Replaces: Revenue_Dept.Employees collection
-- Stores both regular employees AND the admin account
CREATE TABLE IF NOT EXISTS employees (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    employee_id      VARCHAR(255)  UNIQUE DEFAULT NULL,  -- Ethereum wallet address (NULL for admin)
    admin_address    VARCHAR(255)  UNIQUE DEFAULT NULL,  -- Only set for the admin record
    password_hash    VARCHAR(512)  NOT NULL,
    fname            VARCHAR(100)  DEFAULT NULL,
    lname            VARCHAR(100)  DEFAULT NULL,
    revenue_dept_id  VARCHAR(100)  DEFAULT NULL,         -- NULL for admin
    created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_employee_id   (employee_id),
    INDEX idx_admin_address (admin_address)
);
