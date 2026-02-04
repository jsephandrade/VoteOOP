const { z } = require("zod");

const NATIONAL_ID_PATTERN = /^[A-Z0-9]{8,12}$/;

const schemas = {
  electionParams: z.object({
    eid: z.string().trim().min(1, "Election ID is required.").max(64),
  }),
  voterRegister: z.object({
    name: z.string().trim().min(2, "Name is required.").max(120),
    nationalId: z
      .string()
      .trim()
      .regex(NATIONAL_ID_PATTERN, "Invalid National ID format."),
    dateOfBirth: z
      .coerce
      .date()
      .refine((value) => !Number.isNaN(value.getTime()), "Invalid date of birth."),
  }),
  electionRegister: z.object({
    voterId: z.string().trim().min(1, "Voter ID is required."),
  }),
  ballot: z.object({
    voterId: z.string().trim().min(1, "Voter ID is required."),
    candidateId: z.string().trim().min(1, "Candidate ID is required."),
  }),
  adminLogin: z.object({
    password: z.string().trim().min(1, "Password is required."),
  }),
};

function formatIssues(error) {
  const issues = error.issues || [];
  if (!issues.length) return "Invalid request.";
  return issues.map((issue) => issue.message).join(" ");
}

function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({ error: formatIssues(result.error) });
    }
    req[source] = result.data;
    next();
  };
}

module.exports = {
  schemas,
  validate,
};
