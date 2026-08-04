import{a_ as n,ax as R}from"./iframe-Czd7raPx.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-BYVC7fEx.js";import{P as H}from"./project-modal-W6PkOhf5.js";import"./preload-helper-Dp1pzeXC.js";import"./index-rJ6yUmMW.js";import"./Select-ef7c0426.esm-B07MpugR.js";import"./chevron-down-CfdB0fYF.js";import"./check-CgMNdhk3.js";import"./index-DvrqZrta.js";import"./export-menu-d59QGsJ0.js";import"./client-GIOry7b9.js";import"./markdown-preview-C3e5NfIF.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CgBO7fHQ.js";import"./copy-NSN8bDTO.js";import"./file-code-corner-9AE2M2BR.js";import"./loader-circle-BwNyP2c4.js";import"./api-B3P-OtKi.js";import"./folder-open-CGgwsPR9.js";import"./folder-CcL8KPBn.js";import"./tag-color-picker-h4NleYA2.js";import"./project-tag-3f9uZiFn.js";import"./sparkles-r8_qakHw.js";import"./brain-BK46Bh_T.js";import"./chevron-right-CbY9SOK_.js";import"./markdown-editor-CUIGfOEC.js";import"./pencil-B-MSBO25.js";import"./trash-2-ulnVJHFA.js";import"./templates-DQIm_XXB.js";import"./plus-CbvkbeTT.js";import"./task-row-CSWHI7iO.js";import"./blocked-badge-CpAcGrjN.js";import"./selectable-icon-C5gMD2Ze.js";import"./hover-expand-button-Cc0zFkSn.js";import"./index-B7D7UiN0.js";import"./data-refresh-D8uer1rn.js";import"./rotate-ccw-DDAv_ozq.js";import"./play-CB2wotFK.js";import"./square-terminal-DdKSkvep.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-CTW5-irP.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(m=o.parameters)===null||m===void 0||(l=m.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=i.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(g=r.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const planTab = within(dialog).getByRole('tab', {
      name: /plan/i
    });
    await userEvent.click(planTab);
    await expect(planTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ha=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ha as __namedExportsOrder,ja as default};
