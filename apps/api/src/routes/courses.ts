import type { FastifyInstance } from "fastify";
import {
  listCoursesHandler,
  listCategoriesHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
  getCourseHandler,
  createCourseHandler,
  updateCourseHandler,
  publishCourseHandler,
  unpublishCourseHandler,
  deleteCourseHandler,
  listSectionsHandler,
  createSectionHandler,
  updateSectionHandler,
  deleteSectionHandler,
  createLessonHandler,
  updateLessonHandler,
  deleteLessonHandler,
  getLessonHandler,
  createVideoQuestionHandler,
  updateVideoQuestionHandler,
  deleteVideoQuestionHandler,
  upsertLessonQuizHandler,
} from "../controllers/course-controller.js";

export async function courseRoutes(app: FastifyInstance) {
  // ── Courses ─────────────────────────────────────────────────────────────
  app.get("/", listCoursesHandler);
  app.get("/categories", listCategoriesHandler);
  app.post("/categories", createCategoryHandler);
  app.patch("/categories/:categoryId", updateCategoryHandler);
  app.delete("/categories/:categoryId", deleteCategoryHandler);
  app.post("/", createCourseHandler);
  app.get("/:id", getCourseHandler);
  app.patch("/:id", updateCourseHandler);
  app.patch("/:id/publish", publishCourseHandler);
  app.patch("/:id/unpublish", unpublishCourseHandler);
  app.delete("/:id", deleteCourseHandler);

  // ── Sections  /courses/:courseId/sections ────────────────────────────────
  app.get("/:courseId/sections", listSectionsHandler);
  app.post("/:courseId/sections", createSectionHandler);
  app.patch("/:courseId/sections/:sectionId", updateSectionHandler);
  app.delete("/:courseId/sections/:sectionId", deleteSectionHandler);

  // ── Lessons  /courses/:courseId/sections/:sectionId/lessons ─────────────
  app.get("/:courseId/sections/:sectionId/lessons/:lessonId", getLessonHandler);
  app.post("/:courseId/sections/:sectionId/lessons", createLessonHandler);
  app.patch("/:courseId/sections/:sectionId/lessons/:lessonId", updateLessonHandler);
  app.delete("/:courseId/sections/:sectionId/lessons/:lessonId", deleteLessonHandler);

  // ── Video Questions ────────────────────────────────────────────────────────
  app.post("/:courseId/sections/:sectionId/lessons/:lessonId/questions", createVideoQuestionHandler);
  app.patch("/:courseId/sections/:sectionId/lessons/:lessonId/questions/:questionId", updateVideoQuestionHandler);
  app.delete("/:courseId/sections/:sectionId/lessons/:lessonId/questions/:questionId", deleteVideoQuestionHandler);

  // ── Lesson Quiz (End-of-lesson Quiz) ───────────────────────────────────────
  app.put("/:courseId/sections/:sectionId/lessons/:lessonId/quiz", upsertLessonQuizHandler);
}
