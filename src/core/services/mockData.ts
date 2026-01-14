import type { Product } from '../types';

export const MOCK_PRODUCTS: Product[] = [
    {
        id: '1',
        name: 'Dragon Burger',
        description: 'Flaming hot beef patty with jalapeños and spicy mayo.',
        price: 12.99,
        category: 'Burgers',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400',
        isAvailable: true,
        modifiers: [
            { id: 'm1', name: 'No Onions', price: 0 },
            { id: 'm2', name: 'Extra Cheese', price: 1.50 },
            { id: 'm3', name: 'Bacon', price: 2.00 },
        ]
    },
    {
        id: '2',
        name: 'Truffle Burger',
        description: 'Black truffle oil, caramelized onions, and swiss cheese.',
        price: 14.50,
        category: 'Burgers',
        image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=400',
        isAvailable: true,
    },
    {
        id: '3',
        name: 'Golden Fries',
        description: 'Double fried sea salt potato fries.',
        price: 4.50,
        category: 'Sides',
        image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=400',
        isAvailable: true,
    },
    {
        id: '4',
        name: 'Craft Cola',
        description: 'House-made cola with organic botanicals.',
        price: 3.50,
        category: 'Drinks',
        image: 'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?auto=format&fit=crop&q=80&w=400',
        isAvailable: true,
    }
];
