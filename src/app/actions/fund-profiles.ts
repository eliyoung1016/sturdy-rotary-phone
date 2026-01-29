"use server";

import { prisma } from "@/lib/db";
import {
  fundProfileSchema,
  FundProfileInput,
} from "@/lib/schemas/fund-profile";
import { revalidatePath } from "next/cache";

export async function getFundProfiles() {
  const profiles = await prisma.fundProfile.findMany({
    include: {
      currentTemplate: true,
      targetTemplate: true,
    },
    orderBy: {
      id: "desc",
    },
  });
  return profiles;
}

export async function getTemplatesForSelect() {
  const templates = await prisma.template.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
  return templates;
}

export async function upsertFundProfile(data: FundProfileInput) {
  const result = fundProfileSchema.safeParse(data);

  if (!result.success) {
    return { error: "Invalid data" };
  }

  const { id, ...inputData } = result.data;

  try {
    if (id) {
      await prisma.fundProfile.update({
        where: { id },
        data: inputData,
      });
    } else {
      await prisma.fundProfile.create({
        data: inputData,
      });
    }

    revalidatePath("/fund-profiles");
    return { success: true };
  } catch (error) {
    console.error("Error upserting fund profile:", error);
    return { error: "Database error" };
  }
}

export async function deleteFundProfile(id: number) {
  try {
    await prisma.fundProfile.delete({
      where: { id },
    });
    revalidatePath("/fund-profiles");
    return { success: true };
  } catch (error) {
    console.error("Error deleting fund profile:", error);
    return { error: "Database error" };
  }
}
