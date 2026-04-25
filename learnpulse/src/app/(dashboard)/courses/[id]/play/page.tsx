import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import CoursePlayClient from "../course-play-client";
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
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !course) notFound();

  const { data: checkpoints } = await supabase
    .from("checkpoints")
    .select("*")
    .eq("course_id", id)
    .order("position", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl py-4">
      <Suspense
        fallback={<p className="text-center text-zinc-500">Loading session…</p>}
      >
        <CoursePlayClient courseId={id} rows={checkpoints ?? []} />
      </Suspense>
    </div>
  );
}
