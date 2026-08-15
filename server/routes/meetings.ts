import { Router } from 'express';
import {
  getMeetingTypes,
  createMeetingType,
  updateMeetingType,
  deleteMeetingType
} from '../controllers/meetingTypes';
import {
  getMeetingStatuses,
  createMeetingStatus,
  updateMeetingStatus,
  deleteMeetingStatus
} from '../controllers/meetingStatuses';
import {
  getMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  startMeeting,
  completeMeeting,
  deleteMeeting,
  getMeetingSummary
} from '../controllers/meetings';
import {
  getAttendance,
  saveAttendance
} from '../controllers/attendance';
import {
  getMeetingDiscussions,
  createMeetingDiscussion,
  updateMeetingDiscussion,
  deleteMeetingDiscussion
} from '../controllers/meetingDiscussions';

const router = Router();

// Meeting Types routes
router.get('/meeting-types', getMeetingTypes);
router.post('/meeting-types', createMeetingType);
router.put('/meeting-types/:id', updateMeetingType);
router.delete('/meeting-types/:id', deleteMeetingType);

// Meeting Statuses routes
router.get('/meeting-statuses', getMeetingStatuses);
router.post('/meeting-statuses', createMeetingStatus);
router.put('/meeting-statuses/:id', updateMeetingStatus);
router.delete('/meeting-statuses/:id', deleteMeetingStatus);

// Attendance routes
router.get('/attendance', getAttendance);
router.post('/attendance', saveAttendance);

// Meeting Discussions routes
router.get('/meeting-discussions', getMeetingDiscussions);
router.post('/meeting-discussions', createMeetingDiscussion);
router.put('/meeting-discussions/:id', updateMeetingDiscussion);
router.delete('/meeting-discussions/:id', deleteMeetingDiscussion);

// Meetings transactional routes
router.get('/meetings', getMeetings);
router.get('/meetings/:id', getMeetingById);
router.get('/meetings/:id/summary', getMeetingSummary);
router.post('/meetings', createMeeting);
router.put('/meetings/:id', updateMeeting);
router.put('/meetings/:id/start', startMeeting);
router.put('/meetings/:id/complete', completeMeeting);
router.delete('/meetings/:id', deleteMeeting);

export default router;
