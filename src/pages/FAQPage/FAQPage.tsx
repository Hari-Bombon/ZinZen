import React from "react";
import { useRecoilValue } from "recoil";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { darkModeState } from "@store";
import { LandingHeader } from "@components/HeaderDashboard/LandingHeader";
import "bootstrap/dist/css/bootstrap.min.css";

import "@translations/i18n";
import "./FAQPage.scss";

export const FAQPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const darkModeStatus = useRecoilValue(darkModeState);

  return (
    <div className="slide" style={{ display: "flex", justifyContent: "center" }}>
      <LandingHeader avatar={false} />
      <div id="faq-container">
        <div>
          <h3 className={darkModeStatus ? "faq-question-text-dark" : "faq-question-text-light"}>
            {t("Qwhatiszinzen")}
          </h3>
          <p className={darkModeStatus ? "faq-answer-text-dark" : "faq-answer-text-light"}>{t("AnsWhatiszinzen")}</p>
        </div>
        <div>
          <h3 className={darkModeStatus ? "faq-question-text-dark" : "faq-question-text-light"}>
            {t("Qiszinzenprivate")}
          </h3>
          <p className={darkModeStatus ? "faq-answer-text-dark" : "faq-answer-text-light"}>{t("Ansiszinzenprivate")}</p>
        </div>
        <div>
          <h3 className={darkModeStatus ? "faq-question-text-dark" : "faq-question-text-light"}>
            {t("Qiszinzenexpensive")}
          </h3>
          <p className={darkModeStatus ? "faq-answer-text-dark" : "faq-answer-text-light"}>
            {t("Ansiszinzenexpensive")}
          </p>
        </div>
        <div>
          <h3 className={darkModeStatus ? "faq-question-text-dark" : "faq-question-text-light"}>
            {t("Qtoogoodtobetrue")}
          </h3>
          <p className={darkModeStatus ? "faq-answer-text-dark" : "faq-answer-text-light"}>{t("Anstoogoodtobetrue")}</p>
        </div>
        <div>
          <button
            type="button"
            className={darkModeStatus ? "faq-choice-dark" : "faq-choice-light"}
            onClick={() => {
              navigate("/ZinZen/Feedback");
            }}
          >
            {t("ihavedifferentquestions")}
          </button>
          <button
            type="button"
            className={darkModeStatus ? "faq-choice-dark" : "faq-choice-light"}
            onClick={() => {
              navigate("/");
            }}
          >
            {t("ihavenomorequestions")}
          </button>
        </div>
      </div>
    </div>
  );
};
