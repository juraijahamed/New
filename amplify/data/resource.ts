import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*
 * Define your data schema
 * @see https://docs.amplify.aws/gen2/build-a-backend/data/data-modeling
 */
const schema = a.schema({
  User: a.model({
    name: a.string().required(),
    role: a.string().default('staff'),
    email: a.string(),
  }).authorization(allow => [allow.authenticated()]),

  Expense: a.model({
    description: a.string(),
    amount: a.float(),
    category: a.string(),
    date: a.string(),
    receipt_url: a.string(),
    remarks: a.string(),
    status: a.string(),
    // Associate with User (optional, or use owner for simple setup)
    // For now we just store created_by_user_id as string/int if we want to migrate exactly,
    // but better to rely on owner.
  }).authorization(allow => [allow.authenticated()]),

  Sale: a.model({
    date: a.string(),
    agency: a.string(),
    supplier: a.string(),
    national: a.string(),
    service: a.string(),
    net_rate: a.float(),
    sales_rate: a.float(),
    profit: a.float(),
    passport_number: a.string(),
    documents: a.string(),
    remarks: a.string(),
    status: a.string(),
  }).authorization(allow => [allow.authenticated()]),

  Staff: a.model({
    name: a.string().required(),
    position: a.string(),
    salary: a.float(),
    phone: a.string(),
  }).authorization(allow => [allow.authenticated()]),

  SupplierPayment: a.model({
    supplier_name: a.string().required(),
    amount: a.float().required(),
    date: a.string().required(),
    receipt_url: a.string(),
    remarks: a.string(),
    status: a.string(),
  }).authorization(allow => [allow.authenticated()]),

  SalaryPayment: a.model({
    staff_id: a.string(), // ID reference
    staff_name: a.string(),
    amount: a.float().required(),
    advance: a.float().default(0),
    paid_month: a.string().required(),
    date: a.string().required(),
    receipt_url: a.string(),
    remarks: a.string(),
    status: a.string(),
  }).authorization(allow => [allow.authenticated()]),

  DropdownOption: a.model({
    type: a.string().required(),
    value: a.string().required(),
    display_order: a.integer().default(0),
    color: a.string(),
    table_type: a.string(),
  }).authorization(allow => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
