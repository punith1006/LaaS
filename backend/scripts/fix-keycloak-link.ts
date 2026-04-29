import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const RESTORED_USER_ID = '2bfaff37-c422-4974-9139-e7ab53c3f6bb';
  const STALE_USER_ID = '13315c8c-596d-4ee4-ab49-aafad99f9595';
  const KEYCLOAK_SUB = '0fbe8ba9-74c2-4b3a-9d22-5cde9d40ee64';

  // Step 1: Clear keycloakSub from stale user
  await p.user.update({
    where: { id: STALE_USER_ID },
    data: { keycloakSub: null },
  });
  console.log('✅ Cleared keycloakSub from stale user', STALE_USER_ID);

  // Step 2: Set keycloakSub on restored user
  await p.user.update({
    where: { id: RESTORED_USER_ID },
    data: { keycloakSub: KEYCLOAK_SUB },
  });
  console.log('✅ Linked keycloakSub', KEYCLOAK_SUB, 'to restored user', RESTORED_USER_ID);

  // Verify
  const user = await p.user.findUnique({
    where: { id: RESTORED_USER_ID },
    select: { id: true, email: true, keycloakSub: true, storageUid: true, storageProvisioningStatus: true },
  });
  console.log('\n✅ Restored user now:', JSON.stringify(user, null, 2));

  await p.$disconnect();
}
main();
