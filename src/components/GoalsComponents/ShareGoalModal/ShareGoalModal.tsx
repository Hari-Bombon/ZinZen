import { Modal } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";

import GlobalAddIcon from "@assets/images/globalAdd.svg";
import shareAnonymous from "@assets/images/shareAnonymous.svg";
import shareWithFriend from "@assets/images/shareWithFriend.svg";

import Loader from "@src/common/Loader";
import ContactItem from "@src/models/ContactItem";
import ConfirmationModal from "@src/common/ConfirmationModal";
import {
  convertIntoSharedGoal,
  getAllLevelGoalsOfId,
  getGoal,
  shareMyGoalAnonymously,
  updateSharedStatusOfGoal,
} from "@src/api/GoalsAPI";
import { GoalItem } from "@src/models/GoalItem";
import { themeState } from "@src/store/ThemeState";
import { addSubInPub } from "@src/api/PubSubAPI";
import { confirmAction } from "@src/Interfaces/IPopupModals";
import { PublicGroupItem } from "@src/models/PublicGroupItem";
import { displayAddContact, displayShareModal } from "@src/store/GoalsState";
import { getAllPublicGroups } from "@src/api/PublicGroupsAPI";
import { shareGoalWithContact } from "@src/services/contact.service";
import { darkModeState, displayToast, displayConfirmation } from "@src/store";
import { checkAndUpdateRelationshipStatus, getAllContacts } from "@src/api/ContactsAPI";
import SubMenu, { SubMenuItem } from "./SubMenu";
import AddContactModal from "./AddContactModal";

import "./ShareGoalModal.scss";

const ShareGoalModal = ({ goal }: { goal: GoalItem }) => {
  const minContacts = 1;
  const navigate = useNavigate();
  const { state } = useLocation();
  const theme = useRecoilValue(themeState);
  const darkModeStatus = useRecoilValue(darkModeState);
  const showShareModal = useRecoilValue(displayShareModal);

  const [loading, setLoading] = useState({ P: false, A: false, S: false });
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [userGroups, setUserGroups] = useState<PublicGroupItem[]>([]);
  const [displaySubmenu, setDisplaySubmenu] = useState("");
  const [showConfirmation, setDisplayConfirmation] = useRecoilState(displayConfirmation);
  const [confirmationAction, setConfirmationAction] = useState<confirmAction | null>(null);
  const [showAddContactModal, setShowAddContactModal] = useRecoilState(displayAddContact);

  const setShowToast = useSetRecoilState(displayToast);
  const handleShowAddContact = () => {
    navigate("/MyGoals", { state: { ...state, displayAddContact: true } });
  };

  const getContactBtn = (relId = "", name = "", accepted = false) => (
    <div className="contact-icon">
      <button
        type="button"
        style={name === "" || accepted ? {} : { background: "#DFDFDF", color: "#979797" }}
        onClick={async (e) => {
          e.stopPropagation();
          setLoading({ ...loading, S: true });
          if (name === "") handleShowAddContact();
          else {
            const status = accepted ? true : await checkAndUpdateRelationshipStatus(relId);
            if (goal.typeOfGoal === "myGoal" && status) {
              const goalWithChildrens = await getAllLevelGoalsOfId(goal.id, true);
              await shareGoalWithContact(relId, [convertIntoSharedGoal(goal), ...goalWithChildrens]);
              setShowToast({ open: true, message: `Cheers!!, Your goal is shared with ${name}`, extra: "" });
              updateSharedStatusOfGoal(goal.id, relId, name).then(() => console.log("status updated"));
              addSubInPub(goal.id, relId, "shared").then(() => console.log("subscriber added"));
            } else {
              navigator.clipboard.writeText(`${window.location.origin}/invite/${relId}`);
              setShowToast({
                open: true,
                message: "Link copied to clipboard",
                extra: `Your invite hasn't been accepted yet. Send this link to ${name} so that they can add you in their contacts`,
              });
            }
          }
          setLoading({ ...loading, S: false });
        }}
      >
        {name === "" ? <img alt="add contact" className="global-addBtn-img" width={25} src={GlobalAddIcon} /> : name[0]}
      </button>
      {name !== "" && <p style={{ margin: 0 }}>{name}</p>}
    </div>
  );

  const handleActionClick = async (action: string) => {
    if (action === "shareAnonymously") {
      let parentGoalTitle = "root";
      setLoading({ ...loading, A: true });
      if (goal.parentGoalId !== "root") {
        parentGoalTitle = (await getGoal(goal.parentGoalId))?.title || "";
      }
      const { response } = await shareMyGoalAnonymously(goal, parentGoalTitle);
      setShowToast({ open: true, message: response, extra: "" });
      setLoading({ ...loading, A: false });
    } else if (action === "shareWithOne") {
      setDisplaySubmenu("contacts");
      if (contacts.length === 0) {
        handleShowAddContact();
      }
    }
    setConfirmationAction(null);
  };

  const openConfirmationPopUp = async (action: confirmAction) => {
    const { actionCategory, actionName } = action;
    if (actionCategory === "collaboration" && showConfirmation.collaboration[actionName]) {
      setConfirmationAction({ ...action });
      setDisplayConfirmation({ ...showConfirmation, open: true });
    } else if (actionCategory === "goal" && showConfirmation.goal[action.actionName]) {
      setConfirmationAction({ ...action });
      setDisplayConfirmation({ ...showConfirmation, open: true });
    } else {
      await handleActionClick(actionName);
    }
  };
  useEffect(() => {
    (async () => {
      const userContacts = await getAllContacts();
      const groups = await getAllPublicGroups();
      setUserGroups([...groups]);
      setContacts([...userContacts]);
    })();
  }, [showAddContactModal]);
  return (
    <Modal
      open={!!showShareModal}
      closable={false}
      footer={null}
      centered
      style={showAddContactModal ? { zIndex: 1 } : {}}
      onCancel={() => window.history.back()}
      className={`share-modal${darkModeStatus ? "-dark" : ""} popupModal${darkModeStatus ? "-dark" : ""} ${
        darkModeStatus ? "dark" : "light"
      }-theme${theme[darkModeStatus ? "dark" : "light"]}`}
    >
      {confirmationAction && <ConfirmationModal action={confirmationAction} handleClick={handleActionClick} />}
      <p className="popupModal-title">{displaySubmenu === "groups" ? "Share in Public Group" : "Share Goals"}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {displaySubmenu === "groups" ? (
          <SubMenu>
            {userGroups.map((grp) => (
              <SubMenuItem key={grp.id} group={grp} goal={goal} />
            ))}
          </SubMenu>
        ) : (
          <>
            {/* Share Anonymously */}
            <button
              onClick={async () => {
                await openConfirmationPopUp({ actionCategory: "goal", actionName: "shareAnonymously" });
              }}
              type="button"
              className="shareOptions-btn"
            >
              <div className="share-Options">
                {loading.A ? (
                  <Loader />
                ) : (
                  <div className="icon">
                    <img className="secondary-icon" alt="share goal pseudo anonymously" src={shareAnonymous} />
                  </div>
                )}
                <p className={`shareOption-name ${loading.A ? "loading" : ""}`}>Share pseudo anonymously</p>
              </div>
            </button>

            {/* Share 1:1 */}
            <button
              disabled={goal.typeOfGoal !== "myGoal"}
              type="button"
              onClick={async () => {
                if (displaySubmenu !== "contacts")
                  await openConfirmationPopUp({ actionCategory: "goal", actionName: "shareWithOne" });
              }}
              className="shareOptions-btn"
            >
              <div className="share-Options">
                {loading.S ? (
                  <Loader />
                ) : (
                  <div className="icon">
                    <img className="secondary-icon" alt="share with friend" src={shareWithFriend} />
                  </div>
                )}
                <p className={`shareOption-name ${loading.S ? "loading" : ""}`}>
                  Share 1:1 <br />
                  {goal.typeOfGoal === "shared" && ` - Goal is shared with ${goal.shared.contacts[0].name}`}
                  {goal.typeOfGoal === "collaboration" &&
                    ` - Goal is in collaboration with ${goal.collaboration.collaborators[0].name}`}
                </p>
              </div>
              {goal.typeOfGoal === "myGoal" && displaySubmenu === "contacts" && (
                <div className="shareWithContacts">
                  {contacts.length === 0 && (
                    <p className="share-warning">
                      You don&apos;t have a contact yet.
                      <br />
                      Add one!
                    </p>
                  )}
                  {contacts.length > 0 && (
                    <p className="share-warning">
                      Don&apos;t Worry. <br /> We will soon allow our users to add more than 1 contact
                    </p>
                  )}
                  <div
                    id="modal-contact-list"
                    style={contacts.length <= minContacts ? { justifyContent: "flex-start" } : {}}
                  >
                    {contacts.length > 0 &&
                      contacts
                        .slice(0, Math.min(minContacts, contacts.length))
                        .map((ele) => getContactBtn(ele.relId, ele.name, ele.accepted))}
                    {contacts.length === 0 && getContactBtn()}
                  </div>
                </div>
              )}
            </button>
          </>
        )}
      </div>
      {showAddContactModal && (
        <AddContactModal showAddContactModal={showAddContactModal} setShowAddContactModal={setShowAddContactModal} />
      )}
    </Modal>
  );
};

export default ShareGoalModal;
