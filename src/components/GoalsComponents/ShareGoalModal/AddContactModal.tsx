/* eslint-disable jsx-a11y/no-autofocus */
import { addContact } from "@src/api/ContactsAPI";
import { shareInvitation } from "@src/assets";
import Loader from "@src/common/Loader";
import { initRelationship } from "@src/services/contact.service";
import { darkModeState, displayToast } from "@src/store";
import { themeState } from "@src/store/ThemeState";
import React, { useState } from "react";
import { Modal } from "antd";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { createPartner } from "@src/api/PartnerAPI";

interface AddContactModalProps {
  showAddContactModal: boolean;
  setShowAddContactModal: React.Dispatch<React.SetStateAction<boolean>>;
}
const AddContactModal: React.FC<AddContactModalProps> = ({ showAddContactModal, setShowAddContactModal }) => {
  const darkModeStatus = useRecoilValue(darkModeState);
  const theme = useRecoilValue(themeState);
  const [loading, setLoading] = useState(false);
  const [newContact, setNewContact] = useState<{ contactName: string; relId: string } | null>(null);
  const handleCloseAddContact = () => {
    window.history.back();
  };
  const setShowToast = useSetRecoilState(displayToast);

  const addNewContact = async () => {
    let link = "";
    setLoading(true);
    if (newContact) {
      if (newContact.relId === "") {
        const res = await initRelationship();
        if (res.success && res.response.relId && res.response.relId.length > 0) {
          const { relId } = res.response;
          await Promise.all([addContact(newContact?.contactName, relId), createPartner(relId, newContact.contactName)]);
          setNewContact({ ...newContact, relId: res.response.relId });
          link = `${window.location.origin}/invite/${res.response.relId}`;
        } else {
          setShowToast({
            open: true,
            message: "Sorry, we are unable to create new contact",
            extra: "Please submit you query via feedback if this issue persist",
          });
        }
      } else {
        link = `${window.location.origin}/invite/${newContact?.relId}`;
      }
    } else {
      setShowToast({ open: true, message: "Please give a name to this contact", extra: "" });
    }
    if (link !== "") {
      navigator.share({ text: link }).then(() => {
        setNewContact(null);
        handleCloseAddContact();
      });
    }
    setLoading(false);
  };
  return (
    <Modal
      closable={false}
      footer={null}
      centered
      open={showAddContactModal}
      onCancel={() => {
        setNewContact(null);
        handleCloseAddContact();
      }}
      className={`addContact-modal popupModal${darkModeStatus ? "-dark" : ""} ${
        darkModeStatus ? "dark" : "light"
      }-theme${theme[darkModeStatus ? "dark" : "light"]}`}
    >
      <p className="popupModal-title"> Add a contact name </p>
      <input
        autoFocus
        disabled={newContact ? newContact.relId !== "" : false}
        type="text"
        placeholder="Name"
        className="show-feelings__note-input"
        value={newContact?.contactName || ""}
        onChange={(e) => {
          setNewContact({ contactName: e.target.value, relId: newContact?.relId || "" });
        }}
        onKeyDown={async (e) => {
          if (e.key === "Enter") {
            await addNewContact();
          }
        }}
      />
      <br />
      <button
        type="button"
        disabled={loading}
        id="addContact-btn"
        onClick={async () => {
          await addNewContact();
        }}
        className={`addContact-btn action-btn submit-icon${darkModeStatus ? "-dark" : ""}`}
      >
        {loading ? <Loader /> : <img alt="add contact" className="theme-icon" src={shareInvitation} />}
        <span style={loading ? { marginLeft: 28 } : {}}>Share invitation</span>
      </button>
    </Modal>
  );
};

export default AddContactModal;
