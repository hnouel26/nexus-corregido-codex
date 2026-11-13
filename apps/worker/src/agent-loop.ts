import type OpenAI from 'openai';

export class RunCancelledError extends Error {
  constructor() { super('Ejecución cancelada'); }
}
interface LoopOptions {
  messages: OpenAI.ChatCompletionMessageParam[];
  request: (messages: OpenAI.ChatCompletionMessageParam[]) => Promise<OpenAI.ChatCompletion>;
  executeTool: (name: string, input: unknown) => Promise<unknown>;
  isCancelled: () => Promise<boolean>;
  log: (level: 'info' | 'tool_call' | 'tool_result' | 'tool_error' | 'done', message: string, data?: unknown) => Promise<void>;
  maxIterations?: number;
}

export async function runAgentLoop(options: LoopOptions): Promise<string> {
  const { request, executeTool, isCancelled, log } = options;
  const messages = [...options.messages];
  const checkCancelled = async () => {
    if (await isCancelled()) throw new RunCancelledError();
  };
  for (let i = 0; i < (options.maxIterations ?? 15); i++) {
    await checkCancelled();
    await log('info', `Iteración ${i + 1}`);
    const response = await request(messages);
    await checkCancelled();
    const choice = response.choices[0];
    if (!choice) throw new Error('El proveedor devolvió una respuesta vacía');
    const message = choice.message;
    if (choice.finish_reason === 'stop') {
      const output = message.content ?? '';
      await log('done', 'Agente completado.');
      return output;
    }
    if (choice.finish_reason !== 'tool_calls' || !message.tool_calls?.length) {
      throw new Error(`Respuesta incompleta: ${choice.finish_reason}`);
    }
    messages.push(message);
    for (const call of message.tool_calls) {
      await checkCancelled();
      let content: string;
      try {
        const input: unknown = JSON.parse(call.function.arguments);
        await log('tool_call', `Llamando: ${call.function.name}`);
        await checkCancelled();
        const result = await executeTool(call.function.name, input);
        await checkCancelled();
        // Do not persist full tool payloads, which can contain business data
        // and credentials. Results remain available to the current conversation.
        await log('tool_result', `Finalizó: ${call.function.name}`);
        content = JSON.stringify(result) ?? 'null';
        if (content.length > 100_000) throw new Error('Resultado demasiado grande; reduce la consulta');
      } catch (error) {
        if (error instanceof RunCancelledError) throw error;
        content = `Error: ${error instanceof Error ? error.message : String(error)}`;
        await log('tool_error', content);
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content });
    }
  }
  throw new Error('Se alcanzó el límite de iteraciones sin terminar la tarea');
}
