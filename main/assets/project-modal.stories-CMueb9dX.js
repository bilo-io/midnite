import{n,T as R}from"./iframe-DLK6r6p_.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-CBWu9No6.js";import{P as H}from"./project-modal-BLWl05J-.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BTkLbjYt.js";import"./index-DifjHr3G.js";import"./Select-ef7c0426.esm-eNKT3OL1.js";import"./chevron-down-CTeTdGaH.js";import"./check-DNPejkj4.js";import"./triangle-alert-Bv-TETfa.js";import"./export-menu-Dw7XBbMa.js";import"./client-ChWRUonP.js";import"./markdown-preview-CxiisuC3.js";import"./index.dom-D_wTd2ti.js";import"./file-text-DL2WOuRT.js";import"./copy-BqrAC59_.js";import"./file-code-corner-B3tWSAmC.js";import"./loader-circle-DKeO80Ww.js";import"./api-ztCVvV6I.js";import"./inbound-HnPqdwPM.js";import"./folder-open-BPL2u0Oy.js";import"./folder-CHx6bYSe.js";import"./tag-color-picker-DNp1UMaX.js";import"./project-tag-Mkyu5vzR.js";import"./sparkles-KGDv3hIL.js";import"./brain-BnlNounN.js";import"./chevron-right-BwKoYlwL.js";import"./markdown-editor-V1QzRVRq.js";import"./pencil-Du_3HytX.js";import"./trash-2-Bp9dk9fz.js";import"./templates-B6M1OYb3.js";import"./plus-UoslZc19.js";import"./task-row-BjgBcOGm.js";import"./blocked-badge-6OM6yI5F.js";import"./selectable-icon-BXAdiTDL.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-F1VlBrrs.js";import"./arrow-left-Mejt1A0O.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,Ta={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(l=d.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(m=i.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
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
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const Ea=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,Ea as __namedExportsOrder,Ta as default};
