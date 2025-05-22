import { whopApi } from "./whop-api";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function findOrCreateExperience(experienceId: string) {
  const whopExperience = await whopApi.GetExperience({ experienceId });
  const experienceName = whopExperience.experience.name;
  const bizName = whopExperience.experience.company.title;
  const bizId = whopExperience.experience.company.id;

  let experience = await prisma.experience.findUnique({
    where: { id: experienceId },
  });
  if (!experience) {
    experience = await prisma.experience.create({
      data: {
        id: experienceId,
        title: experienceName,
        bizName,
        bizId,
        prompt: "",
        webhookUrl: "",
      },
    });
    sendWhopWebhook({
      content: "Someone installed the creator AI app in their whop!",
    });
  } else {
    experience = await prisma.experience.update({
      where: { id: experienceId },
      data: { title: experienceName, bizName, bizId },
    });
  }
  return experience;
}

export async function sendWhopWebhook({
  content,
  experienceId = "exp_QccW4l1rRJok5d",
}: {
  content: string;
  experienceId?: string;
}) {
  const payload = {
    content, // For simple display if the webhook supports it (Discord-style)
  };

  const experience = await prisma.experience.findUnique({
    where: {
      id: experienceId,
    },
  });

  const webhookUrl =
    experience?.webhookUrl || process.env.DEFAULT_WEBHOOK_URL || "";

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      console.error(
        `Webhook to Whop failed with status ${
          response.status
        }: ${responseBody}. Payload: ${JSON.stringify(payload)}`
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Error sending Whop webhook: ${errorMessage}. Payload: ${JSON.stringify(
        payload
      )}`
    );
  }
}
