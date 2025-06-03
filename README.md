# VoteOOP

The Online Voting System is a secure, object-oriented application that allows registered voters to cast votes in one or more elections, ensures vote integrity, and produces reliable, tamper-evident results. The purpose of this project is to simulate a real-world electronic voting platform where:

Voter Registration & Authentication
New users register with valid credentials (e.g., name, unique ID, date of birth).
Registered voters authenticate themselves before voting.

Candidate Management
Administrators add or remove candidates, specify their details, and assign them to specific elections.

Election Lifecycle
Each election has a defined start/end time.
During “open” periods, authenticated voters can cast exactly one ballot.
After closing, no further votes are accepted, and ballots are tallied.

Ballot Casting & Integrity
Each vote is recorded as a “Ballot” object (voter → candidate, timestamp).
The system prevents duplicate voting (one ballot per election per voter).
Transparent vote counts: administrators can view tallies but cannot retroactively change them.

Results & Reporting
Once an election closes, the system tallies votes per candidate and produces a winner (or ranking).
Administrators can export results (e.g., JSON or CSV).

This project will be organized into distinct OOP modules. Each class encapsulates a single responsibility (e.g., managing ballots, authenticating users), enabling maintainability and testability.

