export type Category = 'Burgers' | 'Sides' | 'Drinks' | 'Desserts' | 'Breakfast';

export interface Modifier {
    id: string;
    name: string;
    price: number;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    category: Category;
    image: string;
    modifiers?: Modifier[];
    availableModifiers?: Modifier[]; // Modifiers that can be added
    removableIngredients?: string[]; // Ingredients that can be removed
    tags?: string[]; // For recommendations (e.g., ['heavy', 'meat'])
    isAvailable: boolean;
    // AI-Enhanced fields
    ingredients?: string[];
    allergens?: string[];
    calories?: number;
    prepTime?: number; // in minutes
    servingSize?: string;
}

export interface OrderItem {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    modifiers: Modifier[];
    image?: string;
}

export interface Order {
    id?: string;
    ticketNumber: string;
    items: OrderItem[];
    totalAmount: number;
    status: 'Pending' | 'Cooking' | 'Ready' | 'Completed' | 'Cancelled';
    customerEmail: string;
    createdAt: any; // Firestore Timestamp
    updatedAt?: any;
    orderType: 'Dine-in' | 'Takeaway';
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName?: string;
    favoriteProducts: string[]; // Array of product IDs
    createdAt: any;
    updatedAt: any;
}
