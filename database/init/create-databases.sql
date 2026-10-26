-- GymSlot — PostgreSQL database initialisation
-- This script runs once when the postgres container is first created.
-- Each microservice owns exactly one database.

CREATE DATABASE gym_identity;
CREATE DATABASE gym_student;
CREATE DATABASE gym_slot;
CREATE DATABASE gym_allocation;
CREATE DATABASE gym_attendance;
CREATE DATABASE gym_notification;
CREATE DATABASE gym_complaint;
CREATE DATABASE gym_report;

-- Grant all privileges on each database to the application user.
GRANT ALL PRIVILEGES ON DATABASE gym_identity   TO gym;
GRANT ALL PRIVILEGES ON DATABASE gym_student    TO gym;
GRANT ALL PRIVILEGES ON DATABASE gym_slot       TO gym;
GRANT ALL PRIVILEGES ON DATABASE gym_allocation TO gym;
GRANT ALL PRIVILEGES ON DATABASE gym_attendance TO gym;
GRANT ALL PRIVILEGES ON DATABASE gym_notification TO gym;
GRANT ALL PRIVILEGES ON DATABASE gym_complaint  TO gym;
GRANT ALL PRIVILEGES ON DATABASE gym_report     TO gym;