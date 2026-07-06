"use client";

import QuizPlayer from "@/components/learning/QuizPlayer";
import type { AssignmentUser, QuizQuestion, QuizAnswer } from "@/lib/types/assignments";

interface Props {
  questions: QuizQuestion[];
  assignmentUser: AssignmentUser;
  allowRetakes: boolean;
  open: boolean;
  onClose: () => void;
  onSaveAnswers: (answers: QuizAnswer[]) => Promise<void>;
  onSubmit: (answers: QuizAnswer[], score: number, total: number) => Promise<void>;
}

export function QuizActivity({ questions, assignmentUser, allowRetakes, open, onClose, onSaveAnswers, onSubmit }: Props) {
  if (!open) return null;
  return (
    <QuizPlayer
      questions={questions}
      assignmentUser={assignmentUser}
      allowRetakes={allowRetakes}
      onSaveAnswers={onSaveAnswers}
      onSubmit={onSubmit}
      onClose={onClose}
    />
  );
}
