import{b1 as n,ax as R}from"./iframe-CKwTzkft.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-CxeyeKco.js";import{P as H}from"./project-modal-CeQRIwBV.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CK5ljcxv.js";import"./Select-ef7c0426.esm-f7qfxkky.js";import"./chevron-down-WqA_p3F2.js";import"./check-vGfow3G2.js";import"./export-menu-DRpBDcjr.js";import"./client-CNnQ2zPW.js";import"./markdown-preview-CT810bN6.js";import"./index.dom-D_wTd2ti.js";import"./copy-CbPamcs5.js";import"./file-code-corner-BdhmbO8B.js";import"./file-text-CpVJr1Cz.js";import"./loader-circle-CJM5-tqH.js";import"./api-CcNg5pSP.js";import"./folder-open-D1hn3ia9.js";import"./folder-DsseifLc.js";import"./tag-color-picker-B4WaMyDG.js";import"./project-tag-krssxIUz.js";import"./sparkles-DVlQ-9z5.js";import"./brain-BP9nailV.js";import"./chevron-right-SuWKCavJ.js";import"./markdown-editor-C4vpJ0xI.js";import"./pencil-buXfMIrO.js";import"./trash-2-Ct5TAUyX.js";import"./templates-7TowSv6h.js";import"./project-template-labels-CCoTXDea.js";import"./plus-BT2No7RI.js";import"./task-row-BermyEv6.js";import"./blocked-badge-BFnsJ0_1.js";import"./selectable-icon-ts2NnPx3.js";import"./hover-expand-button-BDJDgV6D.js";import"./index-D4LBgbQ8.js";import"./data-refresh-Dv-Tzyw3.js";import"./rotate-ccw-BQuO0x7_.js";import"./play-CykHw0w8.js";import"./square-terminal-Cdf-pWpw.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-B91XhacH.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
