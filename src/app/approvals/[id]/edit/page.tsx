"use client";

import React from "react";
import { useParams } from "next/navigation";
import NewApprovalPage from "../../new/page";

export default function EditApprovalPage() {
    const params = useParams<{ id: string }>();
    return <NewApprovalPage forcedEditId={params.id} />;
}
