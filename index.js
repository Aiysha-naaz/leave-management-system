const express = require('express');
const app = express();

app.use(express.json());

let employees = [];
let employeeIdCounter = 1;
const ANNUAL_LEAVE_BALANCE = 20;

// Test route
app.get('/', (req, res) => {
  res.send('Hello! Your server is working.');
});

// Add Employee API
app.post('/employees', (req, res) => {
  const { name, email, department, joiningDate } = req.body;

  if (!name || !email || !department || !joiningDate) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // Check for duplicate email
  if (employees.some(e => e.email === email)) {
    return res.status(400).json({ error: 'Email already exists.' });
  }

  const joining = new Date(joiningDate);
  if (isNaN(joining)) {
    return res.status(400).json({ error: 'Invalid joiningDate format.' });
  }

  const newEmployee = {
    id: employeeIdCounter++,
    name,
    email,
    department,
    joiningDate: joining,
    leaveBalance: ANNUAL_LEAVE_BALANCE
  };

  employees.push(newEmployee);
  return res.json(newEmployee);
});

// Utility function to calculate inclusive days between two dates
function getDaysBetween(start, end) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end - start) / msPerDay) + 1;
}

// Check if new leave overlaps with existing leaves for an employee
function isOverlapping(employeeId, startDate, endDate) {
  return leaves.some(leave =>
    leave.employeeId === employeeId &&
    leave.status !== 'Rejected' &&
    (startDate <= leave.endDate && endDate >= leave.startDate)
  );
}

// Apply Leave API
app.post('/leaves/apply', (req, res) => {
  const { employeeId, startDate, endDate } = req.body;

  if (!employeeId || !startDate || !endDate) {
    return res.status(400).json({ error: 'employeeId, startDate and endDate are required.' });
  }

  const employee = employees.find(e => e.id === employeeId);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found.' });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start) || isNaN(end)) {
    return res.status(400).json({ error: 'Invalid date format.' });
  }

  if (end < start) {
    return res.status(400).json({ error: 'endDate cannot be before startDate.' });
  }

  if (start < employee.joiningDate) {
    return res.status(400).json({ error: 'Cannot apply leave before joining date.' });
  }

  // Check overlapping leave requests
  if (isOverlapping(employeeId, start, end)) {
    return res.status(400).json({ error: 'Leave request overlaps with existing leave.' });
  }

  const leaveDays = getDaysBetween(start, end);

  // Calculate current leave balance (we'll create this helper below)
  const currentBalance = getLeaveBalance(employeeId);

  if (leaveDays > currentBalance) {
    return res.status(400).json({ error: 'Leave days exceed available leave balance.' });
  }

  const newLeave = {
    id: leaveIdCounter++,
    employeeId,
    startDate: start,
    endDate: end,
    status: 'Pending',
  };
  leaves.push(newLeave);
  return res.json(newLeave);
});

// Helper to calculate leave balance (Approved leaves only)
function getLeaveBalance(employeeId) {
  const employee = employees.find(e => e.id === employeeId);
  if (!employee) return null;

  const approvedLeaves = leaves.filter(l => l.employeeId === employeeId && l.status === 'Approved');
  const usedDays = approvedLeaves.reduce((total, leave) => {
    return total + getDaysBetween(leave.startDate, leave.endDate);
  }, 0);

  return ANNUAL_LEAVE_BALANCE - usedDays;
}

// Initialize leaves array and leave id counter at the top (if not already)
let leaves = [];
let leaveIdCounter = 1;

// Approve or Reject Leave API
app.put('/leaves/:id/status', (req, res) => {
  const leaveId = parseInt(req.params.id);
  const { status } = req.body;

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be Approved or Rejected.' });
  }

  const leave = leaves.find(l => l.id === leaveId);
  if (!leave) {
    return res.status(404).json({ error: 'Leave request not found.' });
  }

  if (leave.status !== 'Pending') {
    return res.status(400).json({ error: 'Leave request is already processed.' });
  }

  if (status === 'Approved') {
    const currentBalance = getLeaveBalance(leave.employeeId);
    const leaveDays = getDaysBetween(leave.startDate, leave.endDate);

    if (leaveDays > currentBalance) {
      return res.status(400).json({ error: 'Insufficient leave balance to approve.' });
    }
  }

  leave.status = status;

  const updatedBalance = getLeaveBalance(leave.employeeId);

  return res.json({
    leaveRequestId: leave.id,
    status: leave.status,
    leaveBalanceRemaining: updatedBalance
  });
});


// Get Leave Balance API
app.get('/employees/:id/balance', (req, res) => {
  const employeeId = parseInt(req.params.id);
  const employee = employees.find(e => e.id === employeeId);

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found.' });
  }

  const balance = getLeaveBalance(employeeId);

  return res.json({ employeeId, leaveBalance: balance });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

