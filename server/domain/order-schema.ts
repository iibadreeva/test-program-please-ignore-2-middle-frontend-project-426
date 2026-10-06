import "server-only";

import { z } from "zod";
import { createOrderBodySchema } from "@/shared/api-contract";
import {
  checkoutAddressSchema,
  checkoutPhoneSchema,
  checkoutRecipientNameSchema,
  refineDeliveryAddress,
} from "@/shared/checkout-fields-schema";

/**
 * Серверные правила поверх контрактного тела заказа:
 * trim/max, regex телефона, адрес обязателен при delivery.
 */
export const createOrderSchema = createOrderBodySchema
  .extend({
    address: checkoutAddressSchema,
    recipientName: checkoutRecipientNameSchema,
    phone: checkoutPhoneSchema,
  })
  .superRefine(refineDeliveryAddress);

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
