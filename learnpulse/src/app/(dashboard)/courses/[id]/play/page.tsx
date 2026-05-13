import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import CoursePlayClient from "../course-play-client";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: { id: string };
};

export default async function CoursePlayPage({ params }: Props) {
  const { id } = params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: course, error } = await supabase
    .from("courses")
    .select("id,title")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !course) notFound();

  const crumbTitle =
    course.title.length > 26 ? `${course.title.slice(0, 25)}…` : course.title;

  const { data: checkpoints } = await supabase
    .from("checkpoints")
    .select("*")
    .eq("course_id", id)
    .order("position", { ascending: true });

  return (
    <div className="app-container-session">
      <PageHeader
        title="Live session"
        description={`${course.title} — work through checkpoints in your selected mode.`}
        breadcrumbs={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/courses", label: "Courses" },
          { href: `/courses/${id}`, label: crumbTitle },
          { label: "Play" },
        ]}
      />
      <Suspense
        fallback={
          <div className="app-panel pp-skeleton-pulse rounded-2xl py-16 text-center text-app-muted">
            Loading session…
          </div>
        }
      >
        <CoursePlayClient
          courseId={id}
          courseTitle={course.title}
          rows={checkpoints ?? []}
        />
      </Suspense>
    </div>
  );
}
