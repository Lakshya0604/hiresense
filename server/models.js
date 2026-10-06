import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true }
  },
  { timestamps: true }
);

const analysisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    jobTitle: { type: String, maxlength: 120 },
    resumeFile: String,
    jdPreview: String,
    score: Number,
    keywordCoverage: Number,
    llmScore: Number,
    matched: [String],
    missing: [String],
    formatting: Object,
    review: Object
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Analysis = mongoose.models.Analysis || mongoose.model('Analysis', analysisSchema);
