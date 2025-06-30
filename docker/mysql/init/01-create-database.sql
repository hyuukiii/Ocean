-- 데이터베이스 생성 및 설정
CREATE DATABASE IF NOT EXISTS ocean_db
DEFAULT CHARACTER SET utf8mb4
DEFAULT COLLATE utf8mb4_unicode_ci;

USE ocean_db;

-- 사용자 권한 설정
GRANT ALL PRIVILEGES ON ocean_db.* TO 'ocean_user'@'%';
FLUSH PRIVILEGES;