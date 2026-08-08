import{b0 as n,ax as R}from"./iframe-DpvGsIGI.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-CwVKMsXU.js";import{P as H}from"./project-modal-BxrkNcmM.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BwVLjzl6.js";import"./Select-ef7c0426.esm-Bn3D-Fhq.js";import"./chevron-down-D5ESyacF.js";import"./check-C_ZAVvUH.js";import"./export-menu-B0CxHCQR.js";import"./client-DdILtiSj.js";import"./markdown-preview-B4rVbROM.js";import"./index.dom-D_wTd2ti.js";import"./copy-DFWb55e2.js";import"./file-code-corner-5wDz2yee.js";import"./file-text-BKiGqL54.js";import"./loader-circle-D_PzSu__.js";import"./api-DFwonaxN.js";import"./folder-open-a-szK2Iz.js";import"./folder-B--eAv0y.js";import"./tag-color-picker-DSVXKK6h.js";import"./project-tag-B-DxlXEG.js";import"./sparkles-FwqnqOEa.js";import"./brain-CBtHfqSs.js";import"./chevron-right-CGLuzR1x.js";import"./markdown-editor-5SbFz6tS.js";import"./pencil-EvDaZNne.js";import"./trash-2-Cef5tSLd.js";import"./templates-C87jOOEG.js";import"./project-template-labels-BwSgLLPN.js";import"./plus-DpC33igC.js";import"./task-row-BVRQrSOS.js";import"./blocked-badge-CDJWyQOC.js";import"./selectable-icon-Ba4Fi7Hu.js";import"./hover-expand-button-BL_kQxHw.js";import"./index-BF-UdoqL.js";import"./data-refresh-NzaARjR1.js";import"./rotate-ccw-DWCn94G4.js";import"./play-CTD_Skyx.js";import"./square-terminal-BU462BXx.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-Bs9ocb3Y.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
