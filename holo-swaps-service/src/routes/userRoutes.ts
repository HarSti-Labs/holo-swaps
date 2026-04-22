import { Router } from "express";
import { authenticate, optionalAuthenticate } from "@/middleware/auth";
import {
  getPublicProfile,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  blockUser,
  unblockUser,
  reportUser,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getUserReviews,
  getPublicCollection,
  getLeaderboard,
} from "@/controllers/userController";

const router = Router();

// Static routes before /:username to avoid conflicts
router.get("/leaderboard", getLeaderboard);

// /me routes
router.patch("/me", authenticate, updateProfile);
router.get("/me/addresses", authenticate, getAddresses);
router.post("/me/addresses", authenticate, addAddress);
router.patch("/me/addresses/:addressId", authenticate, updateAddress);
router.delete("/me/addresses/:addressId", authenticate, deleteAddress);

// Dynamic user routes
router.get("/:username", optionalAuthenticate, getPublicProfile);
router.get("/:username/reviews", getUserReviews);
router.get("/:username/collection", optionalAuthenticate, getPublicCollection);
router.get("/:username/followers", getFollowers);
router.get("/:username/following", getFollowing);
router.post("/:userId/block", authenticate, blockUser);
router.delete("/:userId/block", authenticate, unblockUser);
router.post("/:userId/report", authenticate, reportUser);
router.post("/:userId/follow", authenticate, followUser);
router.delete("/:userId/follow", authenticate, unfollowUser);

export default router;
