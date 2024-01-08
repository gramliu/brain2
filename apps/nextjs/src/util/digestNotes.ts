import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  PromptTemplate,
  SystemMessagePromptTemplate
} from "langchain/prompts";
import { HumanMessage } from "langchain/schema";
import { DateTime } from "luxon";

import type { Note, NoteDigestSpan } from "@brain2/db";

const chatModel = new ChatOpenAI({
  modelName: "gpt-4-1106-preview",
  temperature: 0.4,
});

const promptString = `You are a seasoned personal assistant. You will be provided with multiple transcripts and notes over the past {{span}}. \
Come up with a comprehensive summary and synthesis of the notes.
Think step-by-step to highlight and emphasize the most important points upfront before going into the details.
When digging into the details, think about areas of reflection and improvement for me. I am always looking to improve myself.
Feel free to ask follow-up questions to help my thought process.

Use markdown to format the text as needed.`;

const promptTemplate = new SystemMessagePromptTemplate({
  prompt: new PromptTemplate({
    template: promptString,
    inputVariables: ["span"],
  }),
});

function noteToMessage(note: Note): HumanMessage {
  const components = [
    ["Title: ", note.title],
    [
      "Date: ",
      DateTime.fromISO(note.createdAt.toString()).toFormat("yyyy-MM-dd HH:mm"),
    ],
    ["Content: \n", note.content],
  ];
  const message = components
    .map(([prefix, content]) => `${prefix}${content}`)
    .join("\n\n####################\n\n");
  return new HumanMessage(message);
}

/**
 * Refine transcript, correcting spelling mistakes and splitting paragraphs as needed
 */
export async function digestNotes(
  notes: Note[],
  span: NoteDigestSpan,
): Promise<string> {
  const noteMessages = notes.map(noteToMessage);
  // TODO: insert span somewhere
  const response = await chatModel.call([
    ...(await promptTemplate.formatMessages({ span })),
    ...noteMessages,
    new HumanMessage(
      `Give me the summary of notes over the past ${span.toLowerCase()}`,
    ),
  ]);

  return response.content.toString();
}