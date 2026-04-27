"use client";

import React from "react";
import { useParams } from "next/navigation";
import { NewApprovalForm } from "../../new/ApprovalForm";

export default function EditApprovalPage() {
    const params = useParams<{ id: string }>();
    return <NewApprovalForm forcedEditId={params.id} />;
}
