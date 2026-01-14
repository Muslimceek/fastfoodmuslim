import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyCGMDL8VtJYQAdV5D0I2kNcMpeu5pQ0kAM';
const genAI = new GoogleGenerativeAI(API_KEY);

export interface ProductSuggestion {
    name: string;
    description: string;
    price: number;
    category: 'Burgers' | 'Sides' | 'Drinks' | 'Desserts';
    ingredients: string[];
    allergens: string[];
    calories: number;
    prepTime: number; // in minutes
    servingSize: string;
    tags: string[];
    imagePrompt: string;
}

export interface AIAnalysisResult {
    suggestion: ProductSuggestion;
    priceAnalysis: {
        recommendedPrice: number;
        priceRange: { min: number; max: number };
        reasoning: string;
    };
    marketInsights: string[];
    competitorComparison: string;
}

/**
 * Get AI-powered product suggestions based on partial input
 */
export async function getProductSuggestions(
    partialName: string,
    category?: string
): Promise<AIAnalysisResult> {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `You are an expert fast food product analyst specializing in Burger King-style menu items. 
    
A restaurant admin is adding a new product: "${partialName}"${category ? ` in the ${category} category` : ''}.

Provide a comprehensive analysis in JSON format with the following structure:
{
  "suggestion": {
    "name": "Complete, appealing product name",
    "description": "Mouth-watering 2-3 sentence description highlighting key features",
    "price": <realistic price in USD>,
    "category": "Burgers|Sides|Drinks|Desserts",
    "ingredients": ["ingredient1", "ingredient2", ...],
    "allergens": ["allergen1", "allergen2", ...],
    "calories": <estimated calories>,
    "prepTime": <preparation time in minutes>,
    "servingSize": "serving size description",
    "tags": ["tag1", "tag2", ...],
    "imagePrompt": "Detailed prompt for generating a professional food photography image"
  },
  "priceAnalysis": {
    "recommendedPrice": <optimal price>,
    "priceRange": { "min": <minimum>, "max": <maximum> },
    "reasoning": "Brief explanation of pricing strategy"
  },
  "marketInsights": [
    "insight 1 about market trends",
    "insight 2 about customer preferences",
    "insight 3 about competitive positioning"
  ],
  "competitorComparison": "How this compares to similar items at McDonald's, Wendy's, etc."
}

Important:
- Base suggestions on real fast food industry standards
- Use realistic pricing for the US market
- Include common allergens (dairy, gluten, soy, nuts, etc.)
- Make the description appetizing and professional
- Ensure ingredients are authentic to the product type
- Tags should include dietary info (spicy, vegetarian, etc.) and meal type (lunch, dinner, snack)

Respond ONLY with valid JSON, no additional text.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from response (handle markdown code blocks)
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```\n?/g, '');
        }

        const analysis: AIAnalysisResult = JSON.parse(jsonText);
        return analysis;
    } catch (error) {
        console.error('Error getting AI suggestions:', error);
        throw new Error('Failed to get AI suggestions. Please try again.');
    }
}

/**
 * Analyze and optimize product pricing
 */
export async function analyzePricing(
    productName: string,
    category: string,
    ingredients: string[]
): Promise<{ recommendedPrice: number; reasoning: string }> {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `As a fast food pricing expert, analyze the optimal price for this product:
    
Product: ${productName}
Category: ${category}
Ingredients: ${ingredients.join(', ')}

Consider:
- Ingredient costs
- Market standards for similar items
- Competitive pricing at major chains
- Perceived value

Respond in JSON format:
{
  "recommendedPrice": <price in USD>,
  "reasoning": "Brief explanation of pricing strategy"
}`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        if (text.startsWith('```json')) {
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (text.startsWith('```')) {
            text = text.replace(/```\n?/g, '');
        }

        return JSON.parse(text);
    } catch (error) {
        console.error('Error analyzing pricing:', error);
        return {
            recommendedPrice: 5.99,
            reasoning: 'Default pricing based on category average'
        };
    }
}

/**
 * Generate product description based on name and ingredients
 */
export async function generateDescription(
    productName: string,
    ingredients: string[]
): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Write a compelling, mouth-watering 2-3 sentence description for this fast food item:

Product: ${productName}
Ingredients: ${ingredients.join(', ')}

The description should:
- Highlight key flavors and textures
- Create appetite appeal
- Be concise and professional
- Match the style of premium fast food chains like Burger King

Respond with ONLY the description text, no additional formatting.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error('Error generating description:', error);
        return `Delicious ${productName} made with premium ingredients.`;
    }
}

/**
 * Get smart autocomplete suggestions as user types
 */
export async function getSmartAutocomplete(
    partialInput: string,
    fieldType: 'name' | 'ingredient' | 'description'
): Promise<string[]> {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    let prompt = '';

    if (fieldType === 'name') {
        prompt = `Given the partial fast food product name "${partialInput}", suggest 5 complete, appealing product names that would fit in a Burger King-style menu. Respond with a JSON array of strings only.`;
    } else if (fieldType === 'ingredient') {
        prompt = `Given the partial ingredient "${partialInput}", suggest 5 common fast food ingredients that start with or contain this text. Respond with a JSON array of strings only.`;
    } else {
        return [];
    }

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        if (text.startsWith('```json')) {
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (text.startsWith('```')) {
            text = text.replace(/```\n?/g, '');
        }

        return JSON.parse(text);
    } catch (error) {
        console.error('Error getting autocomplete:', error);
        return [];
    }
}
