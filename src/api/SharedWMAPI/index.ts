/* eslint-disable no-param-reassign */
import { db } from "@models";
import { GoalItem } from "@src/models/GoalItem";
import { createGoalObjectFromTags } from "@src/helpers/GoalProcessor";
import { collaborateWithContact } from "@src/services/contact.service";
import { getDefaultValueOfShared } from "@src/utils/defaultGenerators";
import { addGoal } from "../GoalsAPI";
import { addSubInPub } from "../PubSubAPI";
import { removeGoalFromPartner } from "../PartnerAPI";

export const addSharedWMSublist = async (parentGoalId: string, goalIds: string[]) => {
  db.transaction("rw", db.sharedWMCollection, async () => {
    await db.sharedWMCollection
      .where("id")
      .equals(parentGoalId)
      .modify((obj: GoalItem) => {
        obj.sublist = [...obj.sublist, ...goalIds];
      });
  }).catch((e) => {
    console.log(e.stack || e);
  });
};

export const addSharedWMGoal = async (goalDetails: object) => {
  const newGoal = createGoalObjectFromTags({ ...goalDetails, typeOfGoal: "shared" });
  await db
    .transaction("rw", db.sharedWMCollection, async () => {
      await db.sharedWMCollection.add(newGoal);
    })
    .then(async () => {
      const { parentGoalId } = newGoal;
      if (parentGoalId !== "root") {
        await addSharedWMSublist(parentGoalId, [newGoal.id]);
      }
    })
    .catch((e) => {
      console.log(e.stack || e);
    });
  return newGoal.id;
};

export const addGoalsInSharedWM = async (goals: GoalItem[]) => {
  goals.forEach((ele) => {
    addSharedWMGoal(ele).then((res) => console.log(res, "added"));
  });
};

export const getSharedWMGoal = async (goalId: string) => {
  const goal: GoalItem[] = await db.sharedWMCollection.where("id").equals(goalId).sortBy("createdAt");
  return goal[0];
};

export const getSharedWMChildrenGoals = async (parentGoalId: string) => {
  const childrenGoals: GoalItem[] = await db.sharedWMCollection
    .where("parentGoalId")
    .equals(parentGoalId)
    .sortBy("createdAt");
  childrenGoals.reverse();
  return childrenGoals;
};

export const getAllSharedWMGoals = async () => {
  const allGoals = await db.sharedWMCollection.toArray();
  allGoals.reverse();
  return allGoals;
};

export const getActiveSharedWMGoals = async () => {
  const activeGoals: GoalItem[] = await db.sharedWMCollection.where("parentGoalId").equals("root").sortBy("createdAt");
  activeGoals.reverse();
  return activeGoals;
};

export const updateSharedWMGoal = async (id: string, changes: object) => {
  db.transaction("rw", db.sharedWMCollection, async () => {
    await db.sharedWMCollection.update(id, changes).then((updated) => updated);
  }).catch((e) => {
    console.log(e.stack || e);
  });
};

export const archiveGoal = async (goal: GoalItem) => {
  db.transaction("rw", db.sharedWMCollection, async () => {
    await db.sharedWMCollection.update(goal.id, { archived: "true" });
  });
  if (goal.parentGoalId !== "root" && !["collaboration", "shared"].includes(goal.typeOfGoal)) {
    const parentGoal = await getSharedWMGoal(goal.parentGoalId);
    db.transaction("rw", db.sharedWMCollection, async () => {
      await db.sharedWMCollection.update(goal.parentGoalId, {
        sublist: parentGoal.sublist.filter((ele) => ele !== goal.id),
      });
    });
  }
};

export const archiveChildrenGoals = async (id: string) => {
  const childrenGoals = await getSharedWMChildrenGoals(id);
  if (childrenGoals) {
    childrenGoals.forEach(async (goal: GoalItem) => {
      await archiveChildrenGoals(goal.id);
      await archiveGoal(goal);
    });
  }
};

export const archiveSharedWMGoal = async (goal: GoalItem) => {
  await archiveChildrenGoals(goal.id);
  await archiveGoal(goal);
};

export const removeSharedWMGoal = async (goalId: string) => {
  await db.sharedWMCollection.delete(goalId).catch((err) => console.log("failed to delete", err));
};

export const removeSharedWMChildrenGoals = async (parentGoalId: string) => {
  const childrenGoals = await getSharedWMChildrenGoals(parentGoalId);
  if (childrenGoals.length === 0) {
    return;
  }
  childrenGoals.forEach((goal) => {
    removeSharedWMChildrenGoals(goal.id);
    removeSharedWMGoal(goal.id);
  });
};

export const transferToMyGoals = async (id: string) => {
  const childrenGoals = await getSharedWMChildrenGoals(id);
  if (childrenGoals.length === 0) {
    return;
  }
  childrenGoals.forEach((goal) => {
    transferToMyGoals(goal.id);
    addGoal(goal).then(async () => removeSharedWMGoal(goal.id));
  });
};

export const convertSharedWMGoalToColab = async (goal: GoalItem) => {
  const { relId, name } = goal.shared.contacts[0];
  collaborateWithContact(relId, goal).then((res) =>
    console.log(res.success ? "colab inv sent" : "failed to sent invite"),
  );
  addSubInPub(goal.id, relId, "collaboration").catch((err) => console.log("failed to add sub in pub", err));
  await transferToMyGoals(goal.id)
    .then(async () => {
      await removeGoalFromPartner(relId, goal);
      const collaboration = JSON.parse(JSON.stringify(goal.collaboration));
      collaboration.collaborators.push({ relId, name });
      addGoal({ ...goal, typeOfGoal: "collaboration", collaboration, shared: getDefaultValueOfShared() })
        .then(async () => {
          removeSharedWMGoal(goal.id);
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => console.log(err));
};
