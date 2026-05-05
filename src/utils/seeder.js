import { addMember, getPlans } from '../store';

export async function runStressTest(count = 2000) {
  const plans = await getPlans();
  const firstNames = ['Amit', 'Raj', 'Vikram', 'Priya', 'Anjali', 'Neha', 'Suresh', 'Rahul', 'Sneha', 'Arjun', 'Vijay', 'Karan', 'Pooja', 'Rohan', 'Simran', 'Ishaan', 'Meera', 'Aditya', 'Divya', 'Yash'];
  const lastNames = ['Sharma', 'Verma', 'Singh', 'Patel', 'Kumar', 'Reddy', 'Gupta', 'Mehta', 'Joshi', 'Yadav', 'Malhotra', 'Bose', 'Chopra', 'Rao', 'Iyer', 'Nair', 'Das', 'Khan', 'Mishra', 'Tiwari'];
  const batches = ['Morning', 'Afternoon', 'Evening', 'Night'];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName} ${i + 1}`;
    const phone = '9' + Math.floor(Math.random() * 900000000 + 100000000);
    const plan = plans[Math.floor(Math.random() * plans.length)];
    
    // Random Start Date between 3 months ago and today
    const start = new Date();
    start.setDate(start.getDate() - Math.floor(Math.random() * 120));
    const startDate = start.toISOString().split('T')[0];
    
    // Calculate Expiry based on duration
    const exp = new Date(start);
    exp.setDate(exp.getDate() + parseInt(plan.duration));
    const expiryDate = exp.toISOString().split('T')[0];
    
    const member = {
      name,
      phone,
      gender: Math.random() > 0.5 ? 'Male' : 'Female',
      batch: batches[Math.floor(Math.random() * batches.length)],
      plan: plan.name,
      price: plan.price,
      discount: 0,
      final: plan.price,
      due: Math.random() > 0.8 ? Math.floor(Math.random() * 500) : 0,
      startDate,
      paymentDate: startDate,
      expiryDate,
      notes: 'Stress Test Entry',
      profileImage: `https://i.pravatar.cc/150?u=${i}`,
      status: 'active'
    };
    
    await addMember(member);
    
    if (i % 100 === 0) console.log(`Seeded ${i} members...`);
  }
}
