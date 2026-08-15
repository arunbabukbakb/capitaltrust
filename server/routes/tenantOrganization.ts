import { Router } from 'express';
import { getOrganizationInfo, updateOrganizationInfo } from '../controllers/tenantOrganization';
import {
  listGroups,
  getGroupDetails,
  createGroup,
  updateGroup,
  deleteGroup,
  getTenantUsersForGroup,
  getGroupMembers,
  getAvailableUsersForGroup,
  addGroupMembers,
  removeGroupMember,
  updateGroupMemberJoinedDate
} from '../controllers/groups';
import {
  listBanks,
  createBank,
  updateBank,
  setPrimaryBank,
  deleteBank
} from '../controllers/banks';

const router = Router();

// Organization Information Routes
router.get('/organization-info', getOrganizationInfo);
router.put('/organization-info', updateOrganizationInfo);

// Group Module Routes
router.get('/groups', listGroups);
router.post('/groups', createGroup);
router.get('/groups/users', getTenantUsersForGroup);
router.get('/groups/:id', getGroupDetails);
router.put('/groups/:id', updateGroup);
router.delete('/groups/:id', deleteGroup);

// Group Members Routes
router.get('/groups/:id/members', getGroupMembers);
router.get('/groups/:id/available-users', getAvailableUsersForGroup);
router.post('/groups/:id/members', addGroupMembers);
router.delete('/groups/:id/members/:userId', removeGroupMember);
router.put('/groups/:id/members/:userId/joined-date', updateGroupMemberJoinedDate);

// Bank Module Routes
router.get('/banks', listBanks);
router.post('/banks', createBank);
router.put('/banks/:id', updateBank);
router.patch('/banks/:id/primary', setPrimaryBank);
router.delete('/banks/:id', deleteBank);

export default router;
