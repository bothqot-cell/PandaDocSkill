import { z } from 'zod';

export const ProposalSpecSchema = z.object({
  version: z.literal('1.0'),
  lead: z.object({
    client_name: z.string().min(1),
    client_email: z.string().email().nullable(),
    address: z.string().nullable(),
    project_type: z.string().min(1),
    city: z.string().nullable().optional()
  }),
  proposal: z.object({
    title: z.string().min(1),
    total_price_cents: z.number().int().nonnegative(),
    currency: z.literal('USD'),
    start_date: z.string().nullable(),
    notes: z.string().nullable(),
    client_supplies: z.array(z.string()),
    scope_of_work: z.string().min(1),
    exclusions: z.string().min(1),
    payment_schedule: z
      .array(
        z.object({
          step: z.number().int().positive(),
          title: z.string().min(1),
          amount_cents: z.number().int().nonnegative(),
          due_trigger: z.string().min(1)
        })
      )
      .min(1),
    needs_review: z.array(z.string())
  }),
  pandadoc: z.object({
    template_id: z.string().min(1),
    tokens: z.record(z.string()),
    recipients: z.array(
      z.object({
        role: z.enum(['Client', 'Salesperson', 'Admin']),
        name: z.string().min(1),
        email: z.string().email()
      })
    ),
    send: z.boolean()
  })
});

export type ProposalSpec = z.infer<typeof ProposalSpecSchema>;
