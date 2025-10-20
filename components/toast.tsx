"use client";

import type { ReactNode } from "react";
import { toast as sonnerToast } from "sonner";
import { CheckCircleFillIcon, WarningIcon } from "./icons";

const iconsByType: Record<"success" | "error", ReactNode> = {
  success: <CheckCircleFillIcon />,
  error: <WarningIcon />,
};

export function toast(props: Omit<ToastProps, "id">) {
  return sonnerToast.custom((id) => (
    <Toast description={props.description} id={id} type={props.type} />
  ));
}

function Toast(props: ToastProps) {
  const { id, type, description } = props;

  return (
    <div className="flex toast-mobile:w-[356px] w-full justify-center">
      <div
        className="flex toast-mobile:w-fit w-full flex-row items-center gap-2 rounded-lg bg-zinc-100 p-3"
        data-testid="toast"
        key={id}
      >
        <div
          className="data-[type=error]:text-red-600 data-[type=success]:text-green-600"
          data-type={type}
        >
          {iconsByType[type]}
        </div>
        <div className="text-sm text-zinc-950">{description}</div>
      </div>
    </div>
  );
}

type ToastProps = {
  id: string | number;
  type: "success" | "error";
  description: string;
};
