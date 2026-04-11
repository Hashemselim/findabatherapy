"use client";

import { useState } from "react";

import type { ClientPortalData } from "@/lib/actions/client-portal";
import { DashboardTabsList, DashboardTabsTrigger } from "@/components/dashboard/ui";
import { Tabs, TabsContent } from "@/components/ui/tabs";

import { PortalHeader } from "./portal-header";
import { PortalOverviewTab } from "./portal-overview-tab";
import { PortalGuardiansTab } from "./portal-guardians-tab";
import { PortalTasksTab } from "./portal-tasks-tab";
import { PortalDocumentsTab } from "./portal-documents-tab";
import { PortalMessagesTab } from "./portal-messages-tab";
import { PortalResourcesTab } from "./portal-resources-tab";
import { PortalToolsTab } from "./portal-tools-tab";
import { PortalActivityTab } from "./portal-activity-tab";

export function ClientPortalManager({ data }: { data: ClientPortalData }) {
  const [activeTab, setActiveTab] = useState("overview");
  const previewUrl = `/dashboard/clients/${data.client.id}/portal/preview`;

  return (
    <div className="space-y-6">
      <PortalHeader
        data={data}
        previewUrl={previewUrl}
        onTabChange={setActiveTab}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <DashboardTabsList className="grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
          <DashboardTabsTrigger value="overview">Overview</DashboardTabsTrigger>
          <DashboardTabsTrigger value="guardians">Guardians</DashboardTabsTrigger>
          <DashboardTabsTrigger value="tasks">Tasks</DashboardTabsTrigger>
          <DashboardTabsTrigger value="documents">Documents</DashboardTabsTrigger>
          <DashboardTabsTrigger value="messages">Messages</DashboardTabsTrigger>
          <DashboardTabsTrigger value="resources">Resources</DashboardTabsTrigger>
          <DashboardTabsTrigger value="tools">Connected Tools</DashboardTabsTrigger>
          <DashboardTabsTrigger value="activity">Activity</DashboardTabsTrigger>
        </DashboardTabsList>

        <TabsContent value="overview">
          <PortalOverviewTab data={data} onTabChange={setActiveTab} />
        </TabsContent>

        <TabsContent value="guardians">
          <PortalGuardiansTab data={data} />
        </TabsContent>

        <TabsContent value="tasks">
          <PortalTasksTab data={data} />
        </TabsContent>

        <TabsContent value="documents">
          <PortalDocumentsTab data={data} />
        </TabsContent>

        <TabsContent value="messages">
          <PortalMessagesTab data={data} />
        </TabsContent>

        <TabsContent value="resources">
          <PortalResourcesTab data={data} />
        </TabsContent>

        <TabsContent value="tools">
          <PortalToolsTab data={data} />
        </TabsContent>

        <TabsContent value="activity">
          <PortalActivityTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
