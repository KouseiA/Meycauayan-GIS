-- =============================================================
-- Meycauayan Emergency GIS Portal — MySQL Schema
-- Database: meycauayan_gis
-- Run this in phpMyAdmin or MySQL CLI before using the app
-- =============================================================

CREATE DATABASE IF NOT EXISTS meycauayan_gis
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE meycauayan_gis;

-- -----------------------------------------------------------------
-- BARANGAYS
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS barangays (
  id            INT            NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)   NOT NULL,
  captain       VARCHAR(150)   DEFAULT NULL,
  population    INT            DEFAULT NULL,
  area          VARCHAR(60)    DEFAULT NULL,
  address       TEXT           DEFAULT NULL,
  contact       VARCHAR(80)    DEFAULT NULL,
  description   TEXT           DEFAULT NULL,
  geojson       JSON           DEFAULT NULL,
  created_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_barangay_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------
-- FACILITIES (police, fire, hospital, healthCenter)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facilities (
  id                VARCHAR(60)    NOT NULL,
  name              VARCHAR(200)   NOT NULL,
  type              ENUM('police','fire','hospital','healthCenter') NOT NULL,
  subtype           VARCHAR(120)   DEFAULT NULL,
  barangay          VARCHAR(100)   DEFAULT NULL,
  address           TEXT           DEFAULT NULL,
  contact           VARCHAR(100)   DEFAULT NULL,
  emergency_hotline VARCHAR(80)    DEFAULT NULL,
  person_in_charge  VARCHAR(200)   DEFAULT NULL,
  operating_hours   VARCHAR(120)   DEFAULT NULL,
  lat               DECIMAL(10,7)  DEFAULT NULL,
  lng               DECIMAL(10,7)  DEFAULT NULL,
  google_maps_url   TEXT           DEFAULT NULL,
  services          JSON           DEFAULT NULL,
  created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------
-- HOTLINES
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hotlines (
  id              INT            NOT NULL AUTO_INCREMENT,
  name            VARCHAR(200)   NOT NULL,
  category        VARCHAR(100)   DEFAULT NULL,
  local_number    VARCHAR(80)    DEFAULT NULL,
  national_number VARCHAR(80)    DEFAULT NULL,
  icon_class      VARCHAR(60)    DEFAULT 'fa-phone',
  sort_order      INT            DEFAULT 0,
  created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------
-- ANNOUNCEMENTS (ticker feed)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
  id          INT            NOT NULL AUTO_INCREMENT,
  message     TEXT           NOT NULL,
  is_active   TINYINT(1)     NOT NULL DEFAULT 1,
  sort_order  INT            DEFAULT 0,
  created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------
-- ADMIN USERS
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id            INT            NOT NULL AUTO_INCREMENT,
  username      VARCHAR(60)    NOT NULL,
  password_hash VARCHAR(255)   NOT NULL,
  created_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default admin account: username=admin  password=admin123
INSERT IGNORE INTO admin_users (username, password_hash)
VALUES ('admin', '$2y$12$YtXlRVFa8cALPKSmHdmw0uhf0.Sby0ATGwWKIuJFpJQyTOlbfr5S.');

-- Default hotlines
INSERT IGNORE INTO hotlines (name, category, local_number, national_number, icon_class, sort_order) VALUES
('Meycauayan City Police Station',     'Police Emergency',    '(044) 840-0001',   '117',  'fa-shield-halved', 1),
('Bureau of Fire Protection',          'Fire Emergency',      '(044) 840-0100',   '911',  'fa-fire',          2),
('Meycauayan City Hospital',           'Medical Emergency',   '(044) 840-0200',   '911',  'fa-hospital',      3),
('City Disaster Risk Reduction Office','Disaster Response',   '(044) 840-0300',   '8888', 'fa-triangle-exclamation', 4),
('Philippine Red Cross - Bulacan',     'Medical Aid',         '(044) 791-0001',   '143',  'fa-circle-plus',   5);

-- Default announcements
INSERT IGNORE INTO announcements (message, is_active, sort_order) VALUES
('Meycauayan City Emergency GIS Portal is now active. Report emergencies to the nearest barangay hall.', 1, 1),
('In case of fire, call BFP at (044) 840-0100 or dial 911 immediately.', 1, 2),
('For medical emergencies, Meycauayan City Hospital operates 24/7. Contact: (044) 840-0200.', 1, 3),
('Stay alert during typhoon season. Monitor PAGASA advisories and follow CDRRMO instructions.', 1, 4);
