import{aZ as n,av as R}from"./iframe-CntJAXSQ.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-DZhIZeIR.js";import{P as H}from"./project-modal-DSXcJkuG.js";import"./preload-helper-Dp1pzeXC.js";import"./index-490MRAhq.js";import"./Select-ef7c0426.esm-CgS_9Nkn.js";import"./chevron-down-DWCX2rQA.js";import"./check-B3A__-pr.js";import"./export-menu-C2UxpeoF.js";import"./client-BXRVasKv.js";import"./markdown-preview-B4tqtGHk.js";import"./index.dom-D_wTd2ti.js";import"./file-text-Dt1GqdZ9.js";import"./copy-BQGJBfu4.js";import"./file-code-corner-DWR5Rg1H.js";import"./loader-circle-CKWmlm8C.js";import"./api-D393iBDt.js";import"./folder-open-BEMpdJy7.js";import"./folder-Dcg3rmRe.js";import"./tag-color-picker-CQ1yMnK5.js";import"./project-tag-CBbYMfsX.js";import"./sparkles-BDe-0bcN.js";import"./brain-GNFy-akB.js";import"./chevron-right-D2NfN5oI.js";import"./markdown-editor-BWk7Cf64.js";import"./pencil-BYVUPpFH.js";import"./trash-2-DYW0ufDo.js";import"./templates-B2aKAjDE.js";import"./project-template-labels-CBpDrs0q.js";import"./plus-DTjnmLyq.js";import"./task-row-D2iOsSwW.js";import"./blocked-badge-CuaTdef6.js";import"./selectable-icon-Br07LQKU.js";import"./hover-expand-button-IgYZCTVW.js";import"./index-v7GAp9ji.js";import"./data-refresh-b-B3Wlzd.js";import"./rotate-ccw-C5M_IuVQ.js";import"./play-Yyyu44nq.js";import"./square-terminal-CeXSnBdU.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-DCKs6xZ7.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
