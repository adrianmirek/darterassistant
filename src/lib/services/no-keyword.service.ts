import type { SupabaseClient } from "@/db/supabase.client";
import type { SubmitNoKeywordCommand, SubmitNoKeywordResponseDTO } from "@/lib/models/nakka.types";

/**
 * Submits a no keyword request to the database
 * This stores user requests when no tournaments are found for their keyword search
 *
 * @param supabase - Supabase client instance
 * @param command - The submission command with keyword, nickname, and optional email
 * @returns Response with the created record ID and timestamp
 */
export async function submitNoKeywordRequest(
  supabase: SupabaseClient,
  command: SubmitNoKeywordCommand
): Promise<SubmitNoKeywordResponseDTO> {
  // Validate required fields
  if (!command.keyword || command.keyword.trim().length < 3) {
    throw new Error("Keyword must be at least 3 characters long");
  }

  if (!command.nickname || command.nickname.trim().length < 3) {
    throw new Error("Nickname must be at least 3 characters long");
  }

  // Prepare the insert data
  const insertData = {
    keyword: command.keyword.trim(),
    nickname: command.nickname.trim(),
    user_email: command.user_email?.trim() || "", // Default to empty string if not provided
  };

  // Insert the record into the nakka.no_keyword table
  const { data, error } = await supabase
    .schema("nakka")
    .from("no_keyword")
    .insert(insertData)
    .select("id, created_at")
    .single();

  if (error) {
    console.error("Error inserting no_keyword record:", error);
    throw new Error(`Failed to submit request: ${error.message}`);
  }

  if (!data) {
    throw new Error("No data returned after inserting no_keyword record");
  }

  return {
    id: data.id,
    created_at: data.created_at,
    message: "Your request has been submitted successfully. We will prepare the data as soon as possible.",
  };
}
