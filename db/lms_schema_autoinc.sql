


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
SET NAMES utf8mb4;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


# Dump of table audit_logs
# ------------------------------------------------------------

DROP TABLE IF EXISTS `audit_logs`;

CREATE TABLE `audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `actor_id` bigint(20) unsigned DEFAULT NULL COMMENT '-> users.id; NULL for system events',
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'e.g. user.login | enrollment.create | certificate.issue',
  `resource_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'e.g. user | course | enrollment',
  `resource_id` bigint(20) unsigned DEFAULT NULL,
  `payload` json DEFAULT NULL COMMENT 'Before/after snapshot for sensitive ops',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_audit_tenant_time` (`tenant_id`,`created_at`),
  KEY `idx_audit_actor_time` (`actor_id`,`created_at`),
  KEY `idx_audit_resource` (`resource_type`,`resource_id`),
  CONSTRAINT `fk_audit_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table badges
# ------------------------------------------------------------

DROP TABLE IF EXISTS `badges`;

CREATE TABLE `badges` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` text COLLATE utf8mb4_unicode_ci,
  `criteria_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'course_complete | quiz_score | streak_days | manual',
  `criteria_value` json NOT NULL COMMENT '{"course_id":1} / {"min_score":80} / {"days":7}',
  PRIMARY KEY (`id`),
  KEY `idx_badges_tenant` (`tenant_id`),
  CONSTRAINT `fk_badges_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table certificates
# ------------------------------------------------------------

DROP TABLE IF EXISTS `certificates`;

CREATE TABLE `certificates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `course_id` bigint(20) unsigned NOT NULL,
  `certificate_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Public-facing readable ID: CERT-2024-000042',
  `pdf_url` text COLLATE utf8mb4_unicode_ci COMMENT 'S3 key — generated async by worker',
  `issued_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expires_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_certificates_number` (`certificate_number`),
  KEY `fk_certs_course` (`course_id`),
  KEY `idx_certificates_user` (`user_id`),
  CONSTRAINT `fk_certs_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`),
  CONSTRAINT `fk_certs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table course_prerequisites
# ------------------------------------------------------------

DROP TABLE IF EXISTS `course_prerequisites`;

CREATE TABLE `course_prerequisites` (
  `course_id` bigint(20) unsigned NOT NULL,
  `prerequisite_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`course_id`,`prerequisite_id`),
  KEY `idx_prereq_target` (`prerequisite_id`),
  CONSTRAINT `fk_prereq_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prereq_target` FOREIGN KEY (`prerequisite_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table course_sections
# ------------------------------------------------------------

DROP TABLE IF EXISTS `course_sections`;

CREATE TABLE `course_sections` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_id` bigint(20) unsigned NOT NULL,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_sections_course_order` (`course_id`,`sort_order`),
  CONSTRAINT `fk_sections_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table courses
# ------------------------------------------------------------

DROP TABLE IF EXISTS `courses`;

CREATE TABLE `courses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `created_by` bigint(20) unsigned NOT NULL COMMENT '-> users.id (instructor)',
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `thumbnail_url` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft' COMMENT 'draft | published | archived',
  `language` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'th',
  `duration_minutes` int(11) DEFAULT NULL,
  `published_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_courses_tenant_status` (`tenant_id`,`status`,`deleted_at`),
  KEY `idx_courses_creator` (`created_by`),
  CONSTRAINT `fk_courses_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_courses_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table enrollments
# ------------------------------------------------------------

DROP TABLE IF EXISTS `enrollments`;

CREATE TABLE `enrollments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `course_id` bigint(20) unsigned NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT 'active | completed | expired | cancelled',
  `progress_percent` decimal(5,2) DEFAULT '0.00' COMMENT '0.00 - 100.00',
  `source` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'payment | admin | coupon | free',
  `payment_id` bigint(20) unsigned DEFAULT NULL,
  `coupon_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `enrolled_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completed_at` datetime(3) DEFAULT NULL,
  `expires_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_enrollments_user_course` (`user_id`,`course_id`,`deleted_at`),
  KEY `idx_enrollments_user_status` (`user_id`,`status`),
  KEY `idx_enrollments_course` (`course_id`),
  CONSTRAINT `fk_enrollments_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`),
  CONSTRAINT `fk_enrollments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table lesson_progress
# ------------------------------------------------------------

DROP TABLE IF EXISTS `lesson_progress`;

CREATE TABLE `lesson_progress` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `lesson_id` bigint(20) unsigned NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'not_started' COMMENT 'not_started | in_progress | completed',
  `watch_seconds` int(11) DEFAULT '0' COMMENT 'Video resume position in seconds',
  `completed_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lesson_progress_user_lesson` (`user_id`,`lesson_id`),
  KEY `fk_lp_lesson` (`lesson_id`),
  KEY `idx_lesson_progress_user_status` (`user_id`,`status`),
  CONSTRAINT `fk_lp_lesson` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_lp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table lessons
# ------------------------------------------------------------

DROP TABLE IF EXISTS `lessons`;

CREATE TABLE `lessons` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `section_id` bigint(20) unsigned NOT NULL,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'video | pdf | scorm | xapi | text | quiz | live_session',
  `content_url` text COLLATE utf8mb4_unicode_ci COMMENT 'S3 key or external URL',
  `duration_seconds` int(11) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT '0',
  `is_free_preview` tinyint(1) NOT NULL DEFAULT '0',
  `has_iv_questions` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Flag: lesson has in-video questions',
  `seek_mode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'free' COMMENT 'free | restricted | locked',
  PRIMARY KEY (`id`),
  KEY `idx_lessons_section_order` (`section_id`,`sort_order`),
  CONSTRAINT `fk_lessons_section` FOREIGN KEY (`section_id`) REFERENCES `course_sections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table notifications
# ------------------------------------------------------------

DROP TABLE IF EXISTS `notifications`;

CREATE TABLE `notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'e.g. enrollment_confirmed | quiz_graded | certificate_issued',
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `metadata` json DEFAULT NULL COMMENT '{"course_id":1,"score":85}',
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_notif_user_unread` (`user_id`,`is_read`,`created_at`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table questions
# ------------------------------------------------------------

DROP TABLE IF EXISTS `questions`;

CREATE TABLE `questions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `quiz_id` bigint(20) unsigned NOT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'mcq | multi_select | true_false | short_text | coding',
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Supports Markdown',
  `options` json DEFAULT NULL COMMENT '[{"id":"a","text":"..."}] — NULL for open questions',
  `correct_answer` json DEFAULT NULL COMMENT '{"ids":["a"]} or {"text":"..."} — encrypt at rest',
  `points` int(11) NOT NULL DEFAULT '1',
  `sort_order` int(11) NOT NULL DEFAULT '0',
  `explanation` text COLLATE utf8mb4_unicode_ci COMMENT 'Shown to learner after submission',
  PRIMARY KEY (`id`),
  KEY `idx_questions_quiz_order` (`quiz_id`,`sort_order`),
  CONSTRAINT `fk_questions_quiz` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table quiz_answers
# ------------------------------------------------------------

DROP TABLE IF EXISTS `quiz_answers`;

CREATE TABLE `quiz_answers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `attempt_id` bigint(20) unsigned NOT NULL,
  `question_id` bigint(20) unsigned NOT NULL,
  `response` json NOT NULL COMMENT '{"selected":"a"} / {"text":"..."} / {"code":"..."}',
  `is_correct` tinyint(1) DEFAULT NULL COMMENT 'Set by grading service; NULL for open-ended',
  `score` int(11) DEFAULT NULL COMMENT 'Partial credit support',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_quiz_answers_attempt_question` (`attempt_id`,`question_id`),
  KEY `fk_answers_question` (`question_id`),
  KEY `idx_quiz_answers_attempt` (`attempt_id`),
  CONSTRAINT `fk_answers_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `quiz_attempts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_answers_question` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table quiz_attempts
# ------------------------------------------------------------

DROP TABLE IF EXISTS `quiz_attempts`;

CREATE TABLE `quiz_attempts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `quiz_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `attempt_number` int(11) NOT NULL DEFAULT '1' COMMENT 'Monotonically increasing per user+quiz',
  `score` int(11) DEFAULT NULL COMMENT 'NULL until submitted',
  `passed` tinyint(1) DEFAULT NULL COMMENT 'NULL until submitted',
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `submitted_at` datetime(3) DEFAULT NULL COMMENT 'NULL = still in progress',
  `expires_at` datetime(3) DEFAULT NULL COMMENT 'started_at + time_limit_seconds',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attempts_user_quiz_num` (`user_id`,`quiz_id`,`attempt_number`),
  KEY `fk_attempts_quiz` (`quiz_id`),
  KEY `idx_attempts_user_quiz` (`user_id`,`quiz_id`),
  CONSTRAINT `fk_attempts_quiz` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attempts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table quizzes
# ------------------------------------------------------------

DROP TABLE IF EXISTS `quizzes`;

CREATE TABLE `quizzes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_id` bigint(20) unsigned NOT NULL,
  `lesson_id` bigint(20) unsigned DEFAULT NULL COMMENT 'NULL = standalone quiz not tied to a lesson',
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'graded' COMMENT 'practice | graded | survey',
  `passing_score` int(11) NOT NULL DEFAULT '60' COMMENT '0-100',
  `time_limit_seconds` int(11) DEFAULT NULL COMMENT 'NULL = no time limit',
  `max_attempts` int(11) DEFAULT NULL COMMENT 'NULL = unlimited',
  `shuffle_questions` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_quizzes_lesson` (`lesson_id`),
  KEY `idx_quizzes_course` (`course_id`),
  CONSTRAINT `fk_quizzes_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_quizzes_lesson` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table roles
# ------------------------------------------------------------

DROP TABLE IF EXISTS `roles`;

CREATE TABLE `roles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `permissions` json NOT NULL COMMENT '["course:read","quiz:submit",...]',
  `is_system` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 = built-in role, cannot be deleted by tenant',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_tenant_name` (`tenant_id`,`name`),
  CONSTRAINT `fk_roles_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table tenants
# ------------------------------------------------------------

DROP TABLE IF EXISTS `tenants`;

CREATE TABLE `tenants` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plan` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'free' COMMENT 'free | pro | enterprise',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `settings` json DEFAULT NULL COMMENT 'Brand colors, feature flags per tenant',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tenants_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table user_badges
# ------------------------------------------------------------

DROP TABLE IF EXISTS `user_badges`;

CREATE TABLE `user_badges` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `badge_id` bigint(20) unsigned NOT NULL,
  `earned_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_badges_user_badge` (`user_id`,`badge_id`),
  KEY `fk_user_badges_badge` (`badge_id`),
  KEY `idx_user_badges_user` (`user_id`),
  CONSTRAINT `fk_user_badges_badge` FOREIGN KEY (`badge_id`) REFERENCES `badges` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_badges_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table user_roles
# ------------------------------------------------------------

DROP TABLE IF EXISTS `user_roles`;

CREATE TABLE `user_roles` (
  `user_id` bigint(20) unsigned NOT NULL,
  `role_id` bigint(20) unsigned NOT NULL,
  `assigned_by` bigint(20) unsigned DEFAULT NULL COMMENT '-> users.id (admin who assigned)',
  `assigned_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `fk_user_roles_role` (`role_id`),
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table users
# ------------------------------------------------------------

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) unsigned NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hashed_password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'NULL for SSO-only users',
  `avatar_url` text COLLATE utf8mb4_unicode_ci,
  `locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'th' COMMENT 'BCP 47 language tag',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_login_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_tenant_email` (`tenant_id`,`email`),
  KEY `idx_users_tenant_active` (`tenant_id`,`is_active`),
  CONSTRAINT `fk_users_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table video_question_responses
# ------------------------------------------------------------

DROP TABLE IF EXISTS `video_question_responses`;

CREATE TABLE `video_question_responses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `video_question_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `enrollment_id` bigint(20) unsigned NOT NULL,
  `response` json NOT NULL COMMENT '{"selected":"a"} / {"text":"..."}',
  `is_correct` tinyint(1) DEFAULT NULL COMMENT 'NULL for open-ended or no correct_answer defined',
  `watch_session_id` bigint(20) unsigned DEFAULT NULL COMMENT 'Numeric session id grouping one watch session',
  `responded_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_vqr_question` (`video_question_id`),
  KEY `idx_vqr_user_question` (`user_id`,`video_question_id`),
  KEY `idx_vqr_enrollment` (`enrollment_id`),
  KEY `idx_vqr_session` (`watch_session_id`),
  CONSTRAINT `fk_vqr_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vqr_question` FOREIGN KEY (`video_question_id`) REFERENCES `video_questions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vqr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of table video_questions
# ------------------------------------------------------------

DROP TABLE IF EXISTS `video_questions`;

CREATE TABLE `video_questions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `lesson_id` bigint(20) unsigned NOT NULL COMMENT 'lesson.type must be video',
  `timestamp_seconds` int(11) NOT NULL COMMENT 'Second at which video pauses to show question',
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'mcq | true_false | short_text',
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Question text (Markdown)',
  `options` json DEFAULT NULL COMMENT '[{"id":"a","text":"..."}] — NULL for short_text',
  `correct_answer` json DEFAULT NULL COMMENT '{"ids":["a"]} — NULL for open-ended',
  `explanation` text COLLATE utf8mb4_unicode_ci COMMENT 'Shown after learner responds',
  `is_blocking` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1 = must respond before continuing',
  `can_skip_after` int(11) DEFAULT NULL COMMENT 'Seconds before skip button appears; NULL = no skip',
  `sort_order` int(11) NOT NULL DEFAULT '0' COMMENT 'For multiple questions at the same timestamp',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_vq_lesson_timestamp` (`lesson_id`,`timestamp_seconds`),
  KEY `idx_vq_lesson_order` (`lesson_id`,`sort_order`),
  CONSTRAINT `fk_vq_lesson` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





# Dump of triggers
# ------------------------------------------------------------

/*!50003 SET @OLD_SQL_MODE=@@SQL_MODE*/;;
/*!50003 SET SQL_MODE="IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION" */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_certificates_number` AFTER INSERT ON `certificates` FOR EACH ROW BEGIN
  UPDATE certificates
  SET certificate_number = CONCAT(
    'CERT-',
    YEAR(NEW.issued_at), '-',
    LPAD(NEW.id, 6, '0')
  )
  WHERE id = NEW.id
    AND (certificate_number IS NULL OR certificate_number = '');
END*/;;
DELIMITER ;
/*!50003 SET SQL_MODE=@OLD_SQL_MODE */;



/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;


