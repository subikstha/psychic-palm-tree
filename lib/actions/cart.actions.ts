"use server";

import { cookies } from "next/headers";
import { CartItem } from "@/types";
import { convertToPlainObject, formatError } from "../utils";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { cartItemSchema } from "../validators";

export async function addItemToCart(data: CartItem) {
  try {
    // Check for cart cookie
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    if (!sessionCartId) throw new Error("Cart session not found");

    // Get session and user ID
    const session = await auth();
    const userId = session?.user?.id ? (session.user.id as string) : undefined;

    // Get Cart
    const cart = await getMyCart();

    // Parse and validate item
    const item = cartItemSchema.parse(data);

    // Find item in the database
    const product = await prisma.product.findFirst({
      where: { id: item.productId },
    });

    // Testing
    console.log({
      "Session Cart ID": sessionCartId, // ef0aeea4-dc0e-4562-9db0-62cbf125aa18 (Session cart id on Feb 24, 2025 - 7:43AM)
      "User ID": userId,
      itemRequested: item,
      productFound: product,
    });
    return {
      success: true,
      message: "Item added to cart",
    };
  } catch (error) {
    return {
      success: true,
      message: formatError(error),
    };
  }
}

export async function getMyCart() {
  // Check for cart cookie
  const sessionCartId = (await cookies()).get("sessionCartId")?.value;
  if (!sessionCartId) throw new Error("Cart session not found");

  // Get session and user ID
  const session = await auth();
  const userId = session?.user?.id ? (session.user.id as string) : undefined;

  // Get user cart from database
  const cart = await prisma.cart.findFirst({
    where: userId ? { userId: userId } : { sessionCartId: sessionCartId },
  });

  if (!cart) return undefined;

  // Convert decimals and return
  return convertToPlainObject({
    ...cart,
    items: cart.items as CartItem[],
    itemsPrice: cart.itemsPrice.toString(),
    totalPrice: cart.totalPrice.toString(),
    shippingPrice: cart.shippingPrice.toString(),
    taxPrice: cart.taxPrice.toString(),
  });
}
