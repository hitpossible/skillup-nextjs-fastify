import type { FastifyInstance } from "fastify";
import {
  listCoursesHandler,
  getCourseHandler,
  createCourseHandler,
  updateCourseHandler,
  publishCourseHandler,
  deleteCourseHandler,
  listSectionsHandler,
  createSectionHandler,
  updateSectionHandler,
  deleteSectionHandler,
  createLessonHandler,
  updateLessonHandler,
  deleteLessonHandler,
} from "../controllers/course-controller.js";

export async function courseRoutes(app: FastifyInstance) {
  // ── Courses ─────────────────────────────────────────────────────────────
  app.get("/", listCoursesHandler);
  app.post("/", createCourseHandler);
  app.get("/:id", getCourseHandler);
  app.patch("/:id", updateCourseHandler);
  app.patch("/:id/publish", publishCourseHandler);
  app.delete("/:id", deleteCourseHandler);

  // ── Sections  /courses/:courseId/sections ────────────────────────────────
  app.get("/:courseId/sections", listSectionsHandler);
  app.post("/:courseId/sections", createSectionHandler);
  app.patch("/:courseId/sections/:sectionId", updateSectionHandler);
  app.delete("/:courseId/sections/:sectionId", deleteSectionHandler);

  // ── Lessons  /courses/:courseId/sections/:sectionId/lessons ─────────────
  app.post("/:courseId/sections/:sectionId/lessons", createLessonHandler);
  app.patch("/:courseId/sections/:sectionId/lessons/:lessonId", updateLessonHandler);
  app.delete("/:courseId/sections/:sectionId/lessons/:lessonId", deleteLessonHandler);
}
