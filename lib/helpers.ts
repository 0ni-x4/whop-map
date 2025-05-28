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
    include: { places: true },
  });
  if (!experience) {
    experience = await prisma.experience.create({
      data: {
        id: experienceId,
        title: experienceName,
        bizName,
        bizId,
        webhookUrl: "",
      },
      include: { places: true },
    });
    sendWhopWebhook({
      content: "Someone installed the map places app in their whop!",
    });
  } else {
    experience = await prisma.experience.update({
      where: { id: experienceId },
      data: { title: experienceName, bizName, bizId },
      include: { places: true },
    });
  }
  return experience;
}

export async function createPlace({
  experienceId,
  name,
  description,
  latitude,
  longitude,
  address,
  category,
}: {
  experienceId: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  category?: string;
}) {
  return await prisma.place.create({
    data: {
      experienceId,
      name,
      description,
      latitude,
      longitude,
      address,
      category,
    },
  });
}

export async function getPlaces(experienceId: string) {
  return await prisma.place.findMany({
    where: { experienceId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deletePlace(placeId: string) {
  return await prisma.place.delete({
    where: { id: placeId },
  });
}

export async function updatePlace({
  placeId,
  name,
  description,
  latitude,
  longitude,
  address,
  category,
}: {
  placeId: string;
  name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  category?: string;
}) {
  return await prisma.place.update({
    where: { id: placeId },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude }),
      ...(address !== undefined && { address }),
      ...(category !== undefined && { category }),
    },
  });
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

  // Skip webhook if no URL is configured
  if (!webhookUrl || webhookUrl.trim() === "") {
    console.log("No webhook URL configured, skipping webhook");
    return;
  }

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
