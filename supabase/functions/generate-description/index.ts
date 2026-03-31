import Anthropic from "@anthropic-ai/sdk";

interface RequestBody {
  image_url: string;
  manual_description?: string;
  product_name: string;
  category: string;
  language?: string;
}

interface ResponseBody {
  description: string;
  description_source: "AI_GENERATED" | "HYBRID";
  success: boolean;
  error?: string;
}

const client = new Anthropic();

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const {
      image_url,
      manual_description,
      product_name,
      category,
      language = "pt-BR",
    } = (await req.json()) as RequestBody;

    if (!image_url || !product_name) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: image_url, product_name",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Detectar tipo de imagem (URL ou base64)
    let imageSource: Anthropic.ImageBlockParam["source"];
    if (image_url.startsWith("data:image")) {
      const [headerPart, dataPart] = image_url.split(",");
      const mediaType =
        headerPart.match(/:(.*?);/)?.[1] || "image/jpeg";
      imageSource = {
        type: "base64",
        media_type: mediaType as
          | "image/jpeg"
          | "image/png"
          | "image/gif"
          | "image/webp",
        data: dataPart,
      };
    } else {
      imageSource = {
        type: "url",
        url: image_url,
      };
    }

    // System prompt
    let systemPrompt = `Você é um especialista em descrição de pratos e bebidas para cardápios de restaurante.
Seu objetivo é criar descrições curtas, apetitosas e informativas em ${language}.

Regras:
- Máximo 2-3 linhas (120-150 caracteres)
- Mencione ingredientes principais observáveis na foto
- Tome nota de características visuais (cores, texturas, apresentação)
- Evite genéricos ("delicioso", "gostoso", "incrível")
- Seja específico e descritivo
- Tom deve ser profissional mas atraente`;

    let userPrompt = `Produto: ${product_name}
Categoria: ${category}

Olhando a imagem do prato/bebida, crie uma descrição atraente para este cardápio.`;

    // Se houver descrição manual, usar como base
    if (manual_description) {
      systemPrompt += `\n\nVocê tem acesso à descrição original do cardápio. Use-a como referência para contexto, mas aproveite a imagem para enriquecer e melhorar a descrição.`;
      userPrompt += `\n\nDescrição do cardápio atual (para referência): "${manual_description}"`;
    }

    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 200,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: imageSource,
            },
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
    });

    const description =
      response.content[0].type === "text" ? response.content[0].text : "";
    const description_source = manual_description ? "HYBRID" : "AI_GENERATED";

    return new Response(
      JSON.stringify({
        description,
        description_source,
        success: true,
      } as ResponseBody),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error generating description:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
